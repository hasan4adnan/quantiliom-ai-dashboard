import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { auth, signOut, type User } from "../lib/firebase";
import {
  postSendVerificationCode,
  postVerifyEmailCode,
  type LocalUser,
  VerificationApiError,
} from "../lib/api";
import { LeftPanel } from "./LoginScreen";

const CODE_LENGTH = 6;

type Props = {
  fbUser: User;
  /**
   * Called with the freshly-verified user row after the backend confirms
   * the code. AuthGate uses this to advance its state machine without a
   * second /api/auth/verify round-trip.
   */
  onVerified: (user: LocalUser) => void;
};

type Toast =
  | { kind: "error"; message: string }
  | { kind: "info"; message: string }
  | { kind: "success"; message: string };

/**
 * EmailVerificationScreen — the gate that sits between a password
 * sign-up and the onboarding wizard. Asks the backend to mail a 6-digit
 * code, accepts the digits in a 6-box input, then confirms via
 * /api/auth/verify-email-code. Cooldown for resend is driven by the
 * server response (cooldownMs) rather than hardcoded here so the two
 * never drift out of sync.
 */
export default function EmailVerificationScreen({ fbUser, onVerified }: Props) {
  const [digits, setDigits] = useState<string[]>(() => Array(CODE_LENGTH).fill(""));
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldownMs, setResendCooldownMs] = useState(0);
  const [toast, setToast] = useState<Toast | null>(null);
  const [initialSendInFlight, setInitialSendInFlight] = useState(true);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  // Guards against React StrictMode's deliberate double-effect in dev:
  // we want exactly one "initial send" per mount even when the effect
  // body runs twice.
  const sentInitialRef = useRef(false);

  const code = useMemo(() => digits.join(""), [digits]);
  const codeComplete = code.length === CODE_LENGTH && /^\d{6}$/.test(code);

  const clearToast = useCallback(() => setToast(null), []);

  const startCooldown = useCallback((ms: number) => {
    setResendCooldownMs(Math.max(0, Math.ceil(ms)));
  }, []);

  // Drive the cooldown countdown. One interval, recreated whenever a
  // cooldown is started; cleared on unmount or when it reaches zero.
  useEffect(() => {
    if (resendCooldownMs <= 0) return;
    const tick = setInterval(() => {
      setResendCooldownMs((ms) => {
        const next = ms - 1000;
        return next <= 0 ? 0 : next;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [resendCooldownMs]);

  const requestCode = useCallback(
    async (mode: "initial" | "resend") => {
      try {
        const idToken = await fbUser.getIdToken();
        const result = await postSendVerificationCode(idToken);
        if (result.alreadyVerified) {
          // Race: another tab finished verification between sign-in and
          // this call. Bounce out of the gate by forging a refresh —
          // AuthGate will re-run /api/auth/verify and move on.
          window.location.reload();
          return;
        }
        startCooldown(result.cooldownMs);
        if (mode === "resend") {
          setToast({ kind: "success", message: "We sent you a new code." });
        }
      } catch (err) {
        if (err instanceof VerificationApiError && err.status === 429) {
          const retry = typeof err.data.retryAfterMs === "number" ? err.data.retryAfterMs : 60_000;
          startCooldown(retry);
          setToast({ kind: "info", message: err.message });
        } else {
          const message =
            err instanceof Error ? err.message : "Could not send the verification code.";
          setToast({ kind: "error", message });
        }
      }
    },
    [fbUser, startCooldown]
  );

  // Mail the first code automatically on mount. The user landed here
  // straight from Firebase sign-up — they shouldn't have to hit a button
  // to be told to check their inbox.
  useEffect(() => {
    if (sentInitialRef.current) return;
    sentInitialRef.current = true;
    setInitialSendInFlight(true);
    void requestCode("initial").finally(() => setInitialSendInFlight(false));
  }, [requestCode]);

  // Focus the first empty box on mount and whenever the code is reset.
  useEffect(() => {
    if (initialSendInFlight) return;
    const firstEmpty = digits.findIndex((d) => !d);
    const idx = firstEmpty === -1 ? CODE_LENGTH - 1 : firstEmpty;
    inputsRef.current[idx]?.focus();
    // We only want to seize focus on the initial mount / after reset.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSendInFlight]);

  function setDigitAt(index: number, raw: string) {
    const clean = raw.replace(/\D/g, "");
    setDigits((prev) => {
      const next = [...prev];
      if (clean.length <= 1) {
        next[index] = clean;
      } else {
        // The user pasted/typed multiple digits into one box — spread
        // them across the subsequent boxes.
        for (let i = 0; i < clean.length && index + i < CODE_LENGTH; i += 1) {
          next[index + i] = clean[i];
        }
      }
      return next;
    });
    clearToast();
    if (clean) {
      const advance = Math.min(index + clean.length, CODE_LENGTH - 1);
      inputsRef.current[advance]?.focus();
      inputsRef.current[advance]?.select();
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>, index: number) {
    const key = e.key;
    if (key === "Backspace") {
      if (digits[index]) {
        setDigits((prev) => {
          const next = [...prev];
          next[index] = "";
          return next;
        });
      } else if (index > 0) {
        setDigits((prev) => {
          const next = [...prev];
          next[index - 1] = "";
          return next;
        });
        inputsRef.current[index - 1]?.focus();
      }
      e.preventDefault();
      return;
    }
    if (key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      inputsRef.current[index - 1]?.focus();
      inputsRef.current[index - 1]?.select();
      return;
    }
    if (key === "ArrowRight" && index < CODE_LENGTH - 1) {
      e.preventDefault();
      inputsRef.current[index + 1]?.focus();
      inputsRef.current[index + 1]?.select();
      return;
    }
    if (key === "Enter" && codeComplete) {
      e.preventDefault();
      void submit();
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>, index: number) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!pasted) return;
    e.preventDefault();
    setDigitAt(index, pasted.slice(0, CODE_LENGTH - index));
  }

  async function submit(e?: FormEvent) {
    if (e) e.preventDefault();
    if (submitting || !codeComplete) return;
    clearToast();
    setSubmitting(true);
    try {
      const idToken = await fbUser.getIdToken();
      const updated = await postVerifyEmailCode(idToken, code);
      onVerified(updated);
    } catch (err) {
      if (err instanceof VerificationApiError) {
        // Wrong code with attempts remaining — keep them in the gate.
        const message = err.message;
        if (err.status === 410) {
          // Expired: clear the field and let them request a fresh code.
          setDigits(Array(CODE_LENGTH).fill(""));
          startCooldown(0);
        } else if (err.status === 429) {
          // Locked out — must resend before another try.
          setDigits(Array(CODE_LENGTH).fill(""));
        }
        setToast({ kind: "error", message });
      } else {
        const message =
          err instanceof Error ? err.message : "Could not verify the code.";
        setToast({ kind: "error", message });
      }
      // Reselect the first non-empty box so the user can correct.
      const firstEmpty = digits.findIndex((d) => !d);
      const idx = firstEmpty === -1 ? 0 : firstEmpty;
      inputsRef.current[idx]?.focus();
      inputsRef.current[idx]?.select();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    if (resending || resendCooldownMs > 0) return;
    clearToast();
    setResending(true);
    try {
      await requestCode("resend");
      setDigits(Array(CODE_LENGTH).fill(""));
    } finally {
      setResending(false);
    }
  }

  async function handleSignOut() {
    try {
      if (auth) await signOut(auth);
    } catch (err) {
      console.warn("[verify] sign-out failed:", err);
    }
  }

  const email = fbUser.email ?? "your inbox";
  const cooldownSeconds = Math.ceil(resendCooldownMs / 1000);
  const resendDisabled = resending || resendCooldownMs > 0 || initialSendInFlight;

  return (
    <div className="auth-page" role="main">
      <LeftPanel />

      <section className="r-panel vc-panel" aria-label="Verify your email">
        <button
          type="button"
          className="r-back-link"
          onClick={handleSignOut}
          aria-label="Sign out and use a different email"
        >
          <ArrowLeftSvg />
          Sign out
        </button>

        <div className="r-form-wrap vc-form-wrap">
          <div className="vc-badge" aria-hidden="true">
            <EnvelopeSvg />
          </div>

          <h1 className="r-heading vc-heading">Check your inbox.</h1>
          <p className="r-subhead vc-subhead">
            We sent a {CODE_LENGTH}-digit code to
            <br />
            <span className="vc-email">{email}</span>
          </p>

          {toast ? (
            <div
              className={`auth-toast vc-toast ${
                toast.kind === "error" ? "auth-toast-error" : "auth-toast-success"
              }`}
              role={toast.kind === "error" ? "alert" : "status"}
            >
              {toast.kind === "error" ? <AlertSvg /> : <CheckSvg />}
              <span>{toast.message}</span>
            </div>
          ) : null}

          <form onSubmit={submit} noValidate>
            <div className="vc-row" role="group" aria-label="Verification code">
              {digits.map((d, i) => (
                <Fragment key={i}>
                  <input
                    ref={(el) => {
                      inputsRef.current[i] = el;
                    }}
                    className={`vc-box${d ? " is-filled" : ""}`}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]*"
                    maxLength={1}
                    aria-label={`Digit ${i + 1} of ${CODE_LENGTH}`}
                    value={d}
                    onChange={(e) => setDigitAt(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, i)}
                    onPaste={(e) => handlePaste(e, i)}
                    onFocus={(e) => e.target.select()}
                    disabled={submitting || initialSendInFlight}
                  />
                  {i === 2 ? <span className="vc-sep" aria-hidden="true" /> : null}
                </Fragment>
              ))}
            </div>

            <button
              type="submit"
              className="submit-btn vc-submit"
              disabled={!codeComplete || submitting || initialSendInFlight}
            >
              {submitting ? "Verifying…" : "Verify email"}
              {!submitting ? <ArrowRightSvg /> : null}
            </button>
          </form>

          <div className="vc-foot">
            <div className="vc-resend-row">
              <span className="vc-resend-label">Didn&rsquo;t get the email?</span>
              <button
                type="button"
                className="vc-resend-btn"
                onClick={handleResend}
                disabled={resendDisabled}
              >
                {resending
                  ? "Sending…"
                  : resendCooldownMs > 0
                    ? `Resend in ${cooldownSeconds}s`
                    : "Resend code"}
              </button>
            </div>
            <p className="vc-help">
              Check your spam folder if you can&rsquo;t find it. The code expires
              10 minutes after it&rsquo;s sent.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ── inline SVGs (kept local — match LoginScreen's set so the screen
 *    doesn't need a shared icon module just for this).               ── */
function ArrowLeftSvg() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}
function ArrowRightSvg() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
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
function EnvelopeSvg() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="M3.5 7.5l8.5 6 8.5-6" />
    </svg>
  );
}
