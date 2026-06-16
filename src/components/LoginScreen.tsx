import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  auth,
  createUserWithEmailAndPassword,
  GithubAuthProvider,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "../lib/firebase";
import { WEBSITE_URL } from "../lib/config";

type Mode = "signin" | "signup";

const PASSWORD_MIN_LENGTH = 6;

type Props = {
  initialMode?: Mode;
};

/**
 * LoginScreen — pixel port of quantiliom-ai-website/login.html, rewired
 * to run entirely on the dashboard origin. After Firebase succeeds the
 * AuthGate's onAuthStateChanged subscriber takes over (calls /api/auth/
 * verify and decides what to render next).
 *
 * This component intentionally does NOT call the backend itself. Keeping
 * sign-in pure here means the gate is the single source of truth for
 * "what state is the user in?"
 */
export default function LoginScreen({ initialMode = "signin" }: Props) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [githubBusy, setGithubBusy] = useState(false);
  const [microsoftBusy, setMicrosoftBusy] = useState(false);
  const emailRef = useRef<HTMLInputElement | null>(null);

  // Sync mode <-> URL hash so the website can deep-link to /#signup.
  useEffect(() => {
    const apply = () => {
      const h = window.location.hash.toLowerCase();
      if (h === "#signup") setMode("signup");
      else if (h === "#login" || h === "") setMode("signin");
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  function clearFlash() {
    setError(null);
    setInfo(null);
  }

  function toggleMode() {
    clearFlash();
    setMode((m) => (m === "signin" ? "signup" : "signin"));
    setConfirmPassword("");
  }

  async function handleEmailSubmit(e?: FormEvent) {
    if (e) e.preventDefault();
    if (submitting || !auth) return;
    clearFlash();

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError("Please enter your email address.");
      return;
    }
    if (!password) {
      setError(mode === "signup" ? "Please enter a password." : "Please enter your password.");
      return;
    }
    if (mode === "signup") {
      if (password.length < PASSWORD_MIN_LENGTH) {
        setError(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    }

    setSubmitting(true);
    try {
      if (mode === "signup") {
        await createUserWithEmailAndPassword(auth, cleanEmail, password);
      } else {
        await signInWithEmailAndPassword(auth, cleanEmail, password);
      }
      // AuthGate will see the auth-state change and transition the UI.
    } catch (err) {
      setError(friendlyAuthError(err));
      setSubmitting(false);
    }
  }

  async function handleGoogle() {
    if (googleBusy || !auth) return;
    clearFlash();
    setGoogleBusy(true);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (err) {
      const code = errorCode(err);
      if (code !== "auth/popup-closed-by-user" && code !== "auth/cancelled-popup-request") {
        setError(friendlyAuthError(err));
      }
    } finally {
      setGoogleBusy(false);
    }
  }

  async function handleGitHub() {
    if (githubBusy || !auth) return;
    clearFlash();
    setGithubBusy(true);
    try {
      const provider = new GithubAuthProvider();
      // Without this scope GitHub returns email=null for users whose
      // primary address is marked private — which would make our
      // backend reject the ID token (POST /api/auth/verify requires an
      // email claim). Requesting user:email forces GitHub to send the
      // primary verified email even if it's private.
      provider.addScope("user:email");
      await signInWithPopup(auth, provider);
      // AuthGate's onAuthStateChanged subscriber takes it from here.
    } catch (err) {
      const code = errorCode(err);
      if (code !== "auth/popup-closed-by-user" && code !== "auth/cancelled-popup-request") {
        setError(friendlyAuthError(err, "GitHub"));
      }
    } finally {
      setGithubBusy(false);
    }
  }

  async function handleMicrosoft() {
    if (microsoftBusy || !auth) return;
    clearFlash();
    setMicrosoftBusy(true);
    try {
      // Firebase doesn't ship a dedicated MicrosoftAuthProvider — the
      // generic OAuthProvider with the "microsoft.com" id is the
      // documented integration.
      //
      // tenant:"consumers" restricts this flow to personal Microsoft
      // accounts (Outlook / Hotmail / Live / Xbox / Gmail-backed
      // MSAs). The matching Azure App Registration must be on
      // "Personal Microsoft accounts only" — that combination avoids
      // the multitenant "publisher verification required" policy that
      // would otherwise silently close the popup after consent.
      //
      // To re-enable work/school (Entra ID) accounts too, the long
      // term move is to verify the publisher in Azure (MPN ID) and
      // switch back to tenant:"common" + "any tenant + personal" in
      // Azure. Until then, work accounts go through Google/GitHub.
      //
      // prompt:"select_account" forces the account picker every time
      // instead of silently reusing a cached browser session — much
      // less confusing during sign-up since the user sees exactly
      // which account is being used.
      //
      // We don't .addScope("email") / .addScope("profile") — those are
      // OpenID scopes (not Microsoft Graph scopes) and Firebase
      // already includes them by default. Adding them again can
      // confuse Microsoft into rejecting the request.
      const provider = new OAuthProvider("microsoft.com");
      provider.setCustomParameters({
        tenant: "consumers",
        prompt: "select_account",
      });
      await signInWithPopup(auth, provider);
    } catch (err) {
      // Microsoft popups have a known failure mode where the popup
      // closes after consent without completing the token exchange —
      // Firebase surfaces this as `auth/popup-closed-by-user` even
      // though the user didn't actually close it. So unlike the
      // Google/GitHub handlers we DON'T swallow it silently here;
      // staying mute would leave the user thinking nothing happened.
      console.error("[auth] Microsoft sign-in failed:", err);
      const code = errorCode(err);
      if (code === "auth/cancelled-popup-request") return; // double-click; harmless
      setError(microsoftAuthError(err));
    } finally {
      setMicrosoftBusy(false);
    }
  }

  const heading = mode === "signin" ? "Welcome back." : "Create your account.";
  const subhead =
    mode === "signin"
      ? "Sign in to continue to your Quantiliom architecture workspace."
      : "Tell us a little about you next, and your workspace is ready in under a minute.";
  const submitLabel = mode === "signin" ? "Sign in" : "Create account";
  const loadingLabel = mode === "signin" ? "Signing in…" : "Creating account…";
  const legalPrompt = mode === "signin" ? "By signing in" : "By creating an account";
  const togglePrompt = mode === "signin" ? "Don't have an account?" : "Already have an account?";
  const toggleLabel = mode === "signin" ? "Create one →" : "Sign in →";

  return (
    <div className="auth-page" role="main">
      <LeftPanel />

      <section className="r-panel" aria-label="Sign in form">
        <button
          type="button"
          className="r-back-link"
          onClick={() => (window.location.href = WEBSITE_URL)}
          aria-label="Back to home"
        >
          <ArrowLeftSvg />
          Back to home
        </button>

        <div className="r-top-link">
          No account?{" "}
          <a href={`${WEBSITE_URL}/contact-sales.html`}>Get started →</a>
        </div>

        <div className="r-form-wrap">
          <h1 className="r-heading">{heading}</h1>
          <p className="r-subhead">{subhead}</p>

          {error ? (
            <div className="auth-toast auth-toast-error" role="alert">
              <AlertSvg />
              <span>{error}</span>
            </div>
          ) : null}
          {info ? (
            <div className="auth-toast auth-toast-success" role="status">
              <CheckSvg />
              <span>{info}</span>
            </div>
          ) : null}

          <div className="social-grid">
            <button
              type="button"
              className="social-btn"
              onClick={handleGoogle}
              disabled={googleBusy}
            >
              <GoogleLogo />
              {googleBusy ? "Connecting…" : "Google"}
            </button>
            <button
              type="button"
              className="social-btn"
              onClick={() => setError("Apple Sign-In is not configured yet.")}
            >
              <AppleLogo />
              Apple
            </button>
            <button
              type="button"
              className="social-btn"
              onClick={handleGitHub}
              disabled={githubBusy}
            >
              <GitHubLogo />
              {githubBusy ? "Connecting…" : "GitHub"}
            </button>
            <button
              type="button"
              className="social-btn"
              onClick={handleMicrosoft}
              disabled={microsoftBusy}
            >
              <MicrosoftLogo />
              {microsoftBusy ? "Connecting…" : "Microsoft"}
            </button>
            <button
              type="button"
              className="social-btn"
              onClick={() => setError("GitLab Sign-In is not configured yet.")}
            >
              <GitLabLogo />
              GitLab
            </button>
            <button
              type="button"
              className="social-btn"
              onClick={() => setError("Slack Sign-In is not configured yet.")}
            >
              <SlackLogo />
              Slack
            </button>
            <button
              type="button"
              className="social-btn social-btn-sso"
              onClick={() => setError("SSO / SAML is not configured yet.")}
            >
              <LockSvg />
              Continue with SSO / SAML
            </button>
          </div>

          <div className="auth-divider">
            <span>
              {mode === "signin" ? "or sign in with email" : "or sign up with email"}
            </span>
          </div>

          {/* method="post" + action="#" are intentional: we preventDefault
              and route through Firebase in JS, but browsers (Safari /
              Chrome / Firefox) look for these attributes when deciding
              whether to offer to save the credentials to the OS password
              manager. action="#" never actually navigates because of the
              preventDefault. */}
          <form
            onSubmit={handleEmailSubmit}
            method="post"
            action="#"
            noValidate
          >
            <div className="auth-field">
              <label className="auth-field-label" htmlFor="auth-email">
                Email
              </label>
              <div className="auth-field-input-wrap">
                <input
                  ref={emailRef}
                  id="auth-email"
                  // `name` is required for browser/keychain heuristics to
                  // pair the identifier field with the password field
                  // below; without it Safari won't offer to save.
                  name="email"
                  className="auth-field-input"
                  type="email"
                  placeholder="you@company.com"
                  // "username" (not "email") is Apple's canonical pairing
                  // token for password-manager flows where the identifier
                  // happens to be an email. Chrome/Firefox accept both
                  // but "username" gives the most reliable save prompt.
                  autoComplete="username"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    clearFlash();
                  }}
                  required
                />
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-field-label" htmlFor="auth-password">
                Password
              </label>
              <div className="auth-field-input-wrap">
                <input
                  id="auth-password"
                  name="password"
                  className="auth-field-input has-icon"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    clearFlash();
                  }}
                  required
                />
                <button
                  type="button"
                  className="auth-field-icon-btn"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOffSvg /> : <EyeSvg />}
                </button>
              </div>
            </div>

            {mode === "signup" ? (
              <div className="auth-field">
                <label className="auth-field-label" htmlFor="auth-password-confirm">
                  Confirm password
                </label>
                <div className="auth-field-input-wrap">
                  <input
                    id="auth-password-confirm"
                    name="password_confirm"
                    className="auth-field-input"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      clearFlash();
                    }}
                    required
                  />
                </div>
              </div>
            ) : null}

            {mode === "signin" ? (
              <div className="auth-field-meta">
                <label className="auth-check-row">
                  <input type="checkbox" disabled />
                  <span className="auth-check-label">Remember me</span>
                </label>
                <button
                  type="button"
                  className="forgot-link"
                  onClick={() => setInfo("Password reset is coming soon — contact support to recover access.")}
                >
                  Forgot password?
                </button>
              </div>
            ) : null}

            <button type="submit" className="submit-btn" disabled={submitting}>
              {submitting ? loadingLabel : submitLabel}
              {!submitting ? <ArrowRightSvg /> : null}
            </button>
          </form>

          <p className="legal">
            {legalPrompt} you agree to our <a href={`${WEBSITE_URL}/`}>Terms of Service</a>{" "}
            and <a href={`${WEBSITE_URL}/`}>Privacy Policy</a>.
          </p>

          <p className="mode-toggle-row">
            <span>{togglePrompt}</span>
            <a
              href={mode === "signin" ? "#signup" : "#login"}
              onClick={(e) => {
                e.preventDefault();
                toggleMode();
              }}
            >
              {toggleLabel}
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}

export function LeftPanel() {
  return (
    <div className="l-panel" aria-hidden="false">
      <div className="l-body">
        <div className="l-eyebrow">AI Software Architect Platform</div>

        <h1 className="l-headline">
          Design right.<br />
          Build <em>once</em>.
        </h1>

        <p className="l-sub">
          Quantiliom AI is your virtual software architect — it asks the right
          questions, recommends the right architecture, and turns your project
          idea into a complete system blueprint before you write a single line
          of code.
        </p>

        <div className="l-card">
          <div className="l-card-header">
            <div className="l-card-dot l-card-dot-r" />
            <div className="l-card-dot l-card-dot-y" />
            <div className="l-card-dot l-card-dot-g" />
            <span className="l-card-title">quantiliom / review · main</span>
          </div>
          <div className="l-card-line">
            <span className="cm">// Reviewing PR #482 — AuthService refactor</span>
          </div>
          <div className="l-card-line">&nbsp;</div>
          <div className="l-card-line">
            <span className="kw">async</span>{" "}
            <span className="fn">validateToken</span>(
            <span className="hl">token</span>: <span className="kw">string</span>) {"{"}
          </div>
          <div className="l-card-line">
            &nbsp; <span className="kw">const</span> payload ={" "}
            <span className="kw">await</span> <span className="fn">jwt.verify</span>(token,{" "}
            <span className="str">SECRET</span>);
          </div>
          <div className="l-card-line">
            &nbsp; <span className="kw">return</span>{" "}
            <span className="fn">this.users.findById</span>(payload.
            <span className="hl">sub</span>);
          </div>
          <div className="l-card-line">{"}"}</div>
          <div className="l-card-badge">AI review complete · 0 critical issues</div>
        </div>
      </div>

      <div className="l-footer">
        <div className="l-avatar-group">
          <div className="l-avatar">AB</div>
          <div className="l-avatar">MK</div>
          <div className="l-avatar">SR</div>
          <div className="l-avatar">+</div>
        </div>
        <div className="l-testimonial-text">
          &ldquo;We cut code review time by 60% in the first month.&rdquo;
        </div>
        <div className="l-testimonial-meta">500+ engineering teams worldwide</div>
      </div>
    </div>
  );
}

/* ── error mapping ── */
function errorCode(err: unknown): string {
  if (err && typeof err === "object" && "code" in err) {
    return String((err as { code?: unknown }).code ?? "");
  }
  return "";
}

/**
 * Microsoft-specific error mapping. Differs from friendlyAuthError in
 * one key way: we DON'T treat auth/popup-closed-by-user as a no-op.
 * Microsoft's OAuth flow can close the popup after consent without
 * completing the token exchange (most commonly when the Azure App
 * Registration's supportedAccountTypes doesn't match the user's
 * account type, or when the Redirect URI in Azure doesn't exactly
 * match the one Firebase shows). Firebase reports that as
 * popup-closed-by-user — so we surface it with actionable advice.
 */
function microsoftAuthError(err: unknown): string {
  const code = errorCode(err);
  if (code === "auth/popup-closed-by-user") {
    return (
      "The Microsoft sign-in window closed before sign-in completed. " +
      "If this keeps happening, check that your Azure App Registration " +
      "allows both personal and work accounts, and that its Redirect URI " +
      "exactly matches the one Firebase shows."
    );
  }
  if (code === "auth/popup-blocked") {
    return "Popup blocked by the browser. Please allow popups and retry.";
  }
  if (code === "auth/account-exists-with-different-credential") {
    return "An account with this email already exists, but with a different sign-in method. Use the original method to sign in.";
  }
  if (code === "auth/operation-not-allowed") {
    return "Microsoft sign-in isn't enabled for this Firebase project yet.";
  }
  if (code === "auth/internal-error") {
    return "Microsoft sign-in failed inside Firebase. Check the browser console for details and try again.";
  }
  // Fall through to the generic mapper so we still catch network /
  // no-email-claim / etc. cases.
  return friendlyAuthError(err, "Microsoft");
}

function friendlyAuthError(err: unknown, providerLabel?: string): string {
  const code = errorCode(err);
  const map: Record<string, string> = {
    "auth/email-already-in-use": "This email is already registered. Please sign in instead.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/weak-password": `Password is too weak. Use at least ${PASSWORD_MIN_LENGTH} characters.`,
    "auth/missing-password": "Please enter your password.",
    "auth/invalid-credential": "Invalid email or password.",
    "auth/wrong-password": "Invalid email or password.",
    "auth/user-not-found": "No account found with this email.",
    "auth/too-many-requests": "Too many attempts. Please try again later.",
    "auth/network-request-failed": "Network error. Check your connection.",
    "auth/popup-blocked": "Popup blocked by the browser. Please allow popups and retry.",
    // Any OAuth provider — Firebase throws this when the same email is
    // already registered against a different provider. Common path:
    // user signed up with Google, then later clicks GitHub/Microsoft
    // with an account that resolves to the same address.
    "auth/account-exists-with-different-credential":
      "An account with this email already exists, but with a different sign-in method. Use the original method to sign in.",
  };
  if (map[code]) return map[code];

  // OAuth providers can return a token without an email claim if the
  // user's account has no verified email exposed (GitHub private email
  // without user:email scope, Microsoft personal account with no
  // primary email, etc.). Our backend rejects those tokens — surface
  // that as actionable advice rather than the raw backend error.
  if (err && typeof err === "object" && "message" in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === "string" && /email claim/i.test(m)) {
      const provider = providerLabel ?? "account";
      return `Your ${provider} account doesn't expose a verified email. Add and verify one in your ${provider} settings and try again.`;
    }
    if (typeof m === "string" && m) return m;
  }
  return "Sign-in failed. Please try again.";
}

/* ── inline SVGs (kept local — these are auth-only) ── */
function ArrowLeftSvg() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}
function ArrowRightSvg() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}
function AlertSvg() {
  return (
    <svg viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}
function CheckSvg() {
  return (
    <svg viewBox="0 0 24 24">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function EyeSvg() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function EyeOffSvg() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}
function LockSvg() {
  return (
    <svg className="social-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
function GoogleLogo() {
  return (
    <svg className="social-btn-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}
function AppleLogo() {
  return (
    <svg className="social-btn-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}
function GitHubLogo() {
  return (
    <svg className="social-btn-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}
function MicrosoftLogo() {
  return (
    <svg className="social-btn-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M11.4 2H2v9.4h9.4V2z" fill="#F25022" />
      <path d="M22 2h-9.4v9.4H22V2z" fill="#7FBA00" />
      <path d="M11.4 12.6H2V22h9.4v-9.4z" fill="#00A4EF" />
      <path d="M22 12.6h-9.4V22H22v-9.4z" fill="#FFB900" />
    </svg>
  );
}
function GitLabLogo() {
  return (
    <svg className="social-btn-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.65 14.39L12 22.13 1.35 14.39a.84.84 0 0 1-.3-.94l1.22-3.78 2.44-7.51A.42.42 0 0 1 4.82 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.49h8.1l2.44-7.51A.42.42 0 0 1 18.6 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.51L23 13.45a.84.84 0 0 1-.35.94z" fill="#FC6D26" />
    </svg>
  );
}
function SlackLogo() {
  return (
    <svg className="social-btn-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.122 2.521a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.268 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zm-2.523 10.122a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.268a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" fill="#E01E5A" />
    </svg>
  );
}
