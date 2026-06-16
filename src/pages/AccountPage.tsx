import { useEffect, useState } from "react";
import type { Route } from "../lib/router";
import { deleteMe, type LocalUser } from "../lib/api";
import { auth, signOut, type User } from "../lib/firebase";
import { useSubscription, planLabel as planNameLabel } from "../lib/subscription";
import {
  ArrowRightIcon,
  CheckIcon,
  SignOutIcon,
  TrashIcon,
} from "../components/icons";

/* ────────────────────────────────────────────────────────────────────────
 * Onboarding-answer labels (mirror of registration wizard data)
 * ──────────────────────────────────────────────────────────────────────── */
const ROLE_LABELS: Record<string, string> = {
  founder: "Founder / Entrepreneur",
  developer: "Developer",
  student: "Student",
  product_manager: "Product Manager",
  freelancer_agency: "Freelancer / Agency",
  other: "Other",
};

const TECHNICAL_LEVEL_LABELS: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

const USE_CASE_LABELS: Record<string, string> = {
  new_product_architecture: "Architecture for a new product",
  tech_stack_decision: "Choosing the right tech stack",
  cost_estimation: "Technical cost estimation",
  documentation: "Generating technical documentation",
  learning_system_design: "Learning system design",
  other: "Other",
};

const PROJECT_STAGE_LABELS: Record<string, string> = {
  idea: "Just an idea",
  planning_mvp: "Planning an MVP",
  already_building: "Already building",
  scaling_or_refactoring: "Scaling or refactoring",
  other: "Other",
};

const TEAM_SIZE_LABELS: Record<string, string> = {
  solo: "Just me",
  two_to_five: "2–5 people",
  six_to_fifteen: "6–15 people",
  sixteen_plus: "16+ people",
};

const DETAIL_LEVEL_LABELS: Record<string, string> = {
  simple: "Simple",
  balanced: "Balanced",
  technical: "Technical",
};

const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  tr: "Türkçe",
};

const PROVIDER_LABELS: Record<string, string> = {
  "google.com": "Google",
  password: "Email & password",
  "apple.com": "Apple",
  "github.com": "GitHub",
};

function label(map: Record<string, string>, value: string | null | undefined): string {
  if (!value) return "—";
  return map[value] ?? value;
}

function dashIfEmpty(v: string | null | undefined): string {
  return v && v.trim() ? v : "—";
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch (_) {
    return iso;
  }
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (_) {
    return iso;
  }
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase() || "Q";
}

function planDisplayLabel(plan: string): string {
  if (plan === "free" || !plan) return "Free";
  if (plan === "interested_pro") return "Pro (interest)";
  if (plan === "team_evaluation") return "Team (evaluating)";
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}

/* ────────────────────────────────────────────────────────────────────────
 * Page
 * ──────────────────────────────────────────────────────────────────────── */

type Props = {
  fbUser: User;
  localUser: LocalUser;
  onNavigate: (r: Route, p?: string) => void;
  onSignOut: () => void;
};

export default function AccountPage({ fbUser, localUser, onNavigate, onSignOut }: Props) {
  const { sub } = useSubscription();

  const displayName =
    (localUser.name && localUser.name.trim()) ||
    (fbUser.displayName && fbUser.displayName.trim()) ||
    (localUser.email?.split("@")[0] ?? "Quantiliom User");

  const photoURL = localUser.picture || fbUser.photoURL || null;
  const email = localUser.email || fbUser.email || "";

  // Plan label combines the local user's plan with the active
  // subscription state (so a user who has just upgraded sees "Pro"
  // here even though localUser.plan stays "free" — the backend doesn't
  // change `plan` from billing yet).
  const planForDisplay =
    sub.kind === "active" ? planNameLabel(sub.plan) : sub.kind === "cancelled" ? `${planNameLabel(sub.plan)} (cancelled)` : planDisplayLabel(localUser.plan);

  return (
    <div className="page-enter account-page">
      <section className="hero" aria-label="Account">
        <span className="eyebrow">Account</span>
        <h1 className="hero-title">Your account.</h1>
        <p className="hero-sub">
          Everything Quantiliom knows about you, your preferences, and your
          subscription &mdash; plus the option to delete your account
          permanently if you change your mind about the whole thing.
        </p>
      </section>

      {/* ─── Profile ─────────────────────────────────────────────── */}
      <section className="account-section" aria-label="Profile">
        <header className="account-section-head">
          <h2>Profile</h2>
          <p>How Quantiliom identifies you in the workspace.</p>
        </header>

        <div className="account-profile">
          <div className="account-avatar-xl" aria-hidden="true">
            {photoURL ? (
              <img src={photoURL} alt="" referrerPolicy="no-referrer" />
            ) : (
              initials(displayName)
            )}
          </div>
          <div className="account-profile-info">
            <h3 className="account-profile-name">{displayName}</h3>
            {localUser.username ? (
              <p className="account-profile-username">{localUser.username}</p>
            ) : null}
            <p className="account-profile-email">{email}</p>
            <div className="account-badges">
              <span className="account-badge">
                Plan &middot; {planForDisplay}
              </span>
              <span className="account-badge">
                Onboarding &middot;{" "}
                {localUser.onboardingStatus === "completed" ? "Completed" : "Not completed"}
              </span>
              {sub.kind === "active" ? (
                <span className="account-badge account-badge-accent">Active subscription</span>
              ) : null}
              {sub.kind === "cancelled" ? (
                <span className="account-badge account-badge-warn">Cancelled subscription</span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="account-detail-grid">
          <Detail label="Member since" value={formatDate(localUser.createdAt)} />
          <Detail label="Last sign-in" value={formatDateTime(localUser.lastLoginAt)} />
          <Detail label="Sign-in method" value={label(PROVIDER_LABELS, localUser.provider)} />
          <Detail
            label="Last activity"
            value={formatDateTime(localUser.updatedAt)}
          />
        </div>
      </section>

      {/* ─── Workspace preferences ────────────────────────────────── */}
      <section className="account-section" aria-label="Workspace preferences">
        <header className="account-section-head">
          <h2>Workspace preferences</h2>
          <p>
            What you told us when you joined &mdash; Quantiliom uses these to
            tailor the questions it asks and the depth of its answers.
          </p>
        </header>

        <div className="account-detail-grid">
          <Detail label="Role" value={label(ROLE_LABELS, localUser.role)} />
          <Detail label="Technical level" value={label(TECHNICAL_LEVEL_LABELS, localUser.technicalLevel)} />
          <Detail label="Primary use case" value={label(USE_CASE_LABELS, localUser.primaryUseCase)} />
          <Detail label="Project stage" value={label(PROJECT_STAGE_LABELS, localUser.projectStage)} />
          <Detail label="Team size" value={label(TEAM_SIZE_LABELS, localUser.teamSize)} />
          <Detail label="Detail level" value={label(DETAIL_LEVEL_LABELS, localUser.detailLevel)} />
          <Detail label="Preferred language" value={label(LANGUAGE_LABELS, localUser.preferredLanguage)} />
          <Detail
            label="Onboarding completed"
            value={formatDate(localUser.onboardingCompletedAt)}
          />
        </div>
      </section>

      {/* ─── Plan & billing ────────────────────────────────────────── */}
      <section className="account-section" aria-label="Plan and billing">
        <header className="account-section-head">
          <h2>Plan &amp; billing</h2>
          <p>Manage your subscription, billing cycle, and payment method.</p>
        </header>

        <div className="account-plan-card">
          <div>
            <div className="account-plan-tag">Current plan</div>
            <div className="account-plan-name">Quantiliom {planForDisplay}</div>
            <p className="account-plan-sub">
              {sub.kind === "active"
                ? `Billed ${sub.billing === "annual" ? "yearly" : "monthly"}. Renews ${formatDate(sub.nextRenewalAt)}.`
                : sub.kind === "cancelled"
                ? `You keep access until ${formatDate(sub.endsAt)}. No future charges.`
                : "You're on the Free plan. Upgrade any time to unlock unlimited projects."}
            </p>
          </div>
          <button
            type="button"
            className="btn-solid-dark"
            onClick={() => onNavigate("subscription")}
          >
            Manage subscription
            <ArrowRightIcon size={14} />
          </button>
        </div>
      </section>

      {/* ─── Security ─────────────────────────────────────────────── */}
      <section className="account-section" aria-label="Security">
        <header className="account-section-head">
          <h2>Security &amp; identity</h2>
          <p>How you sign in and the audit trail of your account.</p>
        </header>

        <div className="account-detail-grid">
          <Detail label="Username" value={dashIfEmpty(localUser.username)} mono />
          <Detail label="Email" value={dashIfEmpty(email)} mono />
          <Detail
            label="Email verified"
            value={
              localUser.emailVerifiedAt
                ? `Yes · ${formatDate(localUser.emailVerifiedAt)}`
                : "No"
            }
            iconYes={Boolean(localUser.emailVerifiedAt)}
          />
          <Detail label="Welcome email sent" value={formatDate(localUser.welcomeEmailSentAt)} />
        </div>
      </section>

      {/* ─── Danger zone ──────────────────────────────────────────── */}
      <DangerZone email={email} onSignOut={onSignOut} />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────
 * Detail cell
 * ──────────────────────────────────────────────────────────────────────── */
function Detail({
  label,
  value,
  mono,
  iconYes,
}: {
  label: string;
  value: string;
  mono?: boolean;
  iconYes?: boolean;
}) {
  return (
    <div className="account-detail">
      <div className="account-detail-label">{label}</div>
      <div className={"account-detail-value" + (mono ? " mono" : "")}>
        {iconYes !== undefined ? (
          <span
            className={"account-detail-pill " + (iconYes ? "is-yes" : "is-no")}
          >
            {iconYes ? <CheckIcon size={11} /> : "—"}
            {value}
          </span>
        ) : (
          value
        )}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────
 * Danger zone — sign out + delete account
 * ──────────────────────────────────────────────────────────────────────── */

function DangerZone({
  email,
  onSignOut,
}: {
  email: string;
  onSignOut: () => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // After a successful delete we wait a short beat so the user sees the
  // confirmation, then sign out. AuthGate will detect signed-out and
  // render LoginScreen.
  useEffect(() => {
    if (!deleted) return;
    const t = window.setTimeout(async () => {
      try {
        if (auth) await signOut(auth);
      } catch (_) {
        /* token may already be invalidated by the server delete — ignore */
      }
      // Belt-and-braces: if onAuthStateChanged hasn't fired yet, force the
      // dashboard back to a clean root.
      window.location.href = "/";
    }, 1200);
    return () => window.clearTimeout(t);
  }, [deleted]);

  const canConfirm =
    !!email && confirmInput.trim().toLowerCase() === email.toLowerCase();

  async function handleDelete() {
    if (!canConfirm || deleting || !auth?.currentUser) return;
    setDeleting(true);
    setError(null);
    try {
      const idToken = await auth.currentUser.getIdToken();
      await deleteMe(idToken);
      // Wipe the local subscription state — the account is gone, so any
      // residual paid-state mock should be cleared too.
      try {
        window.localStorage.removeItem("quantiliom.dashboard.subscription");
      } catch (_) {
        /* ignore */
      }
      setDeleted(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "We couldn't delete your account. Please try again."
      );
      setDeleting(false);
    }
  }

  if (deleted) {
    return (
      <section className="account-section account-danger" aria-label="Account deleted">
        <div className="account-deleted">
          <div className="account-deleted-mark" aria-hidden="true">
            <CheckIcon size={22} />
          </div>
          <div>
            <div className="account-deleted-title">Account deleted.</div>
            <p className="account-deleted-sub">
              All your data has been removed. Signing you out…
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="account-section account-danger" aria-label="Danger zone">
      <header className="account-section-head">
        <h2>Danger zone</h2>
        <p>Decisions that can&rsquo;t easily be undone.</p>
      </header>

      <div className="account-action-row">
        <div>
          <h3>Sign out</h3>
          <p>
            Sign out on this device. Your account, projects, and subscription
            stay intact.
          </p>
        </div>
        <button
          type="button"
          className="btn-ghost-dark account-action-btn"
          onClick={onSignOut}
        >
          <SignOutIcon size={14} />
          Sign out
        </button>
      </div>

      <div className="account-action-divider" />

      <div className="account-action-row">
        <div>
          <h3>Delete account</h3>
          <p>
            Permanently delete your Quantiliom account, all onboarding answers,
            and any associated workspace data. This action is irreversible.
          </p>
        </div>
        <button
          type="button"
          className="btn-danger account-action-btn"
          onClick={() => {
            setConfirmOpen(true);
            setError(null);
          }}
          disabled={confirmOpen}
        >
          <TrashIcon size={14} />
          Delete account
        </button>
      </div>

      {confirmOpen ? (
        <div className="account-delete-confirm" role="alertdialog" aria-labelledby="delete-confirm-title">
          <h4 id="delete-confirm-title">Are you absolutely sure?</h4>
          <p>This action permanently deletes:</p>
          <ul>
            <li>Your account and every sign-in method linked to it</li>
            <li>Your onboarding answers and workspace preferences</li>
            <li>Your subscription state (no future charges)</li>
            <li>All projects, architecture drafts, and history</li>
          </ul>
          <p>
            You will be signed out immediately. The same email can be used to
            sign up again afterwards.
          </p>

          <label className="account-confirm-input-label" htmlFor="delete-confirm-input">
            Type your email address to confirm:
          </label>
          <span className="account-confirm-email-display">{email}</span>
          <input
            id="delete-confirm-input"
            className="account-confirm-input"
            type="text"
            autoComplete="off"
            placeholder="you@example.com"
            value={confirmInput}
            onChange={(e) => setConfirmInput(e.target.value)}
            disabled={deleting}
          />

          {error ? (
            <div className="account-confirm-error" role="alert">
              {error}
            </div>
          ) : null}

          <div className="account-delete-actions">
            <button
              type="button"
              className="btn-ghost-dark"
              onClick={() => {
                setConfirmOpen(false);
                setConfirmInput("");
                setError(null);
              }}
              disabled={deleting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-danger"
              onClick={handleDelete}
              disabled={!canConfirm || deleting}
            >
              <TrashIcon size={14} />
              {deleting ? "Deleting…" : "Permanently delete"}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
