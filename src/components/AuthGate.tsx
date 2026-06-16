import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  auth,
  initError,
  onAuthStateChanged,
  type User,
} from "../lib/firebase";
import { postVerify, safeUserSummary, type LocalUser } from "../lib/api";
import LoginScreen from "./LoginScreen";
import OnboardingWizard from "./OnboardingWizard";
import EmailVerificationScreen from "./EmailVerificationScreen";
import Splash from "./Splash";

/**
 * AuthGate — the single state machine for the authenticated experience.
 *
 *   loading                  — Firebase resolving persisted session
 *   config-error             — firebase-config.ts not filled in; render card
 *   signed-out               — render <LoginScreen />
 *   verifying                — Firebase has a user, calling /api/auth/verify
 *   verify-error             — backend call failed; render error + retry
 *   needs-email-verification — password sign-up; render <EmailVerificationScreen />
 *   needs-onboarding         — render <OnboardingWizard />
 *   ready                    — render shell via children(fbUser, localUser)
 *
 * The gate never redirects to the website. Sign-in, sign-up, email
 * verification, and the onboarding wizard all live in this repo, so the
 * entire authenticated experience stays on http://localhost:5173.
 */

type Status =
  | { kind: "loading"; label?: string }
  | { kind: "config-error"; message: string }
  | { kind: "signed-out" }
  | { kind: "verifying"; fbUser: User }
  | { kind: "verify-error"; message: string; fbUser: User }
  | { kind: "needs-email-verification"; fbUser: User; localUser: LocalUser }
  | { kind: "needs-onboarding"; fbUser: User; localUser: LocalUser }
  | { kind: "ready"; fbUser: User; localUser: LocalUser };

function nextStatusFor(fbUser: User, localUser: LocalUser): Status {
  // Email verification is required for any user the backend hasn't
  // stamped as verified. Google/social sign-ins are auto-stamped on
  // first /api/auth/verify, so in practice this only catches raw
  // email/password sign-ups.
  if (!localUser.emailVerifiedAt) {
    return { kind: "needs-email-verification", fbUser, localUser };
  }
  if (localUser.onboardingStatus !== "completed") {
    return { kind: "needs-onboarding", fbUser, localUser };
  }
  return { kind: "ready", fbUser, localUser };
}

type Props = {
  children: (fbUser: User, localUser: LocalUser) => ReactNode;
};

export default function AuthGate({ children }: Props) {
  const [status, setStatus] = useState<Status>({ kind: "loading" });

  // /api/auth/verify wrapper used in two places (initial sign-in and retry).
  const runVerify = useCallback(async (fbUser: User) => {
    setStatus({ kind: "verifying", fbUser });
    try {
      const idToken = await fbUser.getIdToken();
      const localUser = await postVerify(idToken);
      console.log("[gate] /api/auth/verify →", safeUserSummary(localUser));
      setStatus(nextStatusFor(fbUser, localUser));
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Could not reach the backend.";
      console.error("[gate] verify failed:", msg);
      setStatus({ kind: "verify-error", message: msg, fbUser });
    }
  }, []);

  useEffect(() => {
    if (initError || !auth) {
      setStatus({
        kind: "config-error",
        message: initError ?? "Firebase Auth is not initialized.",
      });
      return;
    }

    const unsub = onAuthStateChanged(auth, (fbUser) => {
      if (!fbUser) {
        setStatus({ kind: "signed-out" });
        return;
      }
      void runVerify(fbUser);
    });
    return unsub;
  }, [runVerify]);

  // Render
  if (status.kind === "config-error") {
    return <ConfigError message={status.message} />;
  }
  if (status.kind === "loading") {
    return <Splash label={status.label ?? "Checking your session"} />;
  }
  if (status.kind === "signed-out") {
    return <LoginScreen />;
  }
  if (status.kind === "verifying") {
    return <Splash label="Loading your workspace" />;
  }
  if (status.kind === "verify-error") {
    return (
      <VerifyError
        message={status.message}
        onRetry={() => void runVerify(status.fbUser)}
      />
    );
  }
  if (status.kind === "needs-email-verification") {
    return (
      <EmailVerificationScreen
        fbUser={status.fbUser}
        onVerified={(updated) => setStatus(nextStatusFor(status.fbUser, updated))}
      />
    );
  }
  if (status.kind === "needs-onboarding") {
    return (
      <OnboardingWizard
        onComplete={(updated) =>
          setStatus({ kind: "ready", fbUser: status.fbUser, localUser: updated })
        }
      />
    );
  }
  return <>{children(status.fbUser, status.localUser)}</>;
}

function ConfigError({ message }: { message: string }) {
  return (
    <div className="splash" role="alert">
      <div className="error-card">
        <div className="error-mark" aria-hidden="true">
          !
        </div>
        <div className="error-title">Dashboard can&rsquo;t start</div>
        <p className="error-body">{message}</p>
        <p className="error-hint">
          Open the browser console for the full error, then update{" "}
          <code>src/lib/firebase-config.ts</code> and reload.
        </p>
      </div>
    </div>
  );
}

function VerifyError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="splash" role="alert">
      <div className="error-card">
        <div className="error-mark" aria-hidden="true">
          !
        </div>
        <div className="error-title">We couldn&rsquo;t load your account</div>
        <p className="error-body">{message}</p>
        <p className="error-hint">
          The backend is at <code>http://localhost:5050</code>. Make sure it&rsquo;s
          running and its CORS allowlist includes <code>http://localhost:5173</code>.
        </p>
        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          <button type="button" className="wiz-btn wiz-btn-dark" onClick={onRetry}>
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}
