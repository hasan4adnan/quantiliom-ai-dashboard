import { useMemo, useState } from "react";
import type { Route } from "../lib/router";
import { CheckIcon, ReceiptIcon } from "../components/icons";
import {
  billingLabel,
  cancelSubscription,
  formatDate,
  planLabel,
  priceForCycle,
  reactivateSubscription,
  TAX_RATE,
  totalWithTax,
  useSubscription,
  type SubscriptionState,
} from "../lib/subscription";

type PlanKey = "free" | "pro" | "team";
type Billing = "monthly" | "annual";

type Plan = {
  key: PlanKey;
  tier: string;
  name: string;
  monthlyPrice: string;
  annualPrice: string;
  annualOrig?: string;
  annualNote?: string;
  period: string;
  pro?: boolean;
  tagline: string;
  features: { ok: boolean; text: string }[];
};

const PLANS: Plan[] = [
  {
    key: "free",
    tier: "Free forever",
    name: "Starter",
    monthlyPrice: "$0",
    annualPrice: "$0",
    period: "/ month",
    tagline:
      "Explore the platform and get real architecture value on your first project. No credit card required.",
    features: [
      { ok: true, text: "1 project workspace" },
      { ok: true, text: "Full architecture overview" },
      { ok: true, text: "Interactive system diagram" },
      { ok: true, text: "Tech stack recommendation" },
      { ok: true, text: "5 chatbot revisions per project" },
      { ok: false, text: "PDF documentation export" },
      { ok: false, text: "Cost optimization reports" },
      { ok: false, text: "Architecture alternatives" },
    ],
  },
  {
    key: "pro",
    tier: "Most popular",
    name: "Pro",
    monthlyPrice: "$29",
    annualPrice: "$23",
    annualOrig: "$29",
    annualNote: "Billed $276 / year — save $72",
    period: "/ month",
    pro: true,
    tagline:
      "Full access to the architecture workspace for solo founders and developers who need the complete picture.",
    features: [
      { ok: true, text: "Unlimited projects" },
      { ok: true, text: "Full architecture generation" },
      { ok: true, text: "2–3 architecture alternatives" },
      { ok: true, text: "Unlimited chatbot revisions" },
      { ok: true, text: "PDF documentation export" },
      { ok: true, text: "Cost optimization reports" },
      { ok: true, text: "Security recommendations" },
      { ok: true, text: "Full tech stack comparisons" },
    ],
  },
  {
    key: "team",
    tier: "For teams",
    name: "Team",
    monthlyPrice: "$79",
    annualPrice: "$63",
    annualOrig: "$79",
    annualNote: "Billed $756 / year — save $192",
    period: "/ month",
    tagline:
      "Collaborate on architecture decisions across your entire team in shared, versioned workspaces.",
    features: [
      { ok: true, text: "Everything in Pro" },
      { ok: true, text: "Up to 5 team members" },
      { ok: true, text: "Shared project workspaces" },
      { ok: true, text: "Collaborative revision history" },
      { ok: true, text: "Team comments & annotations" },
      { ok: true, text: "Organization workspace" },
      { ok: true, text: "Priority support" },
      { ok: false, text: "Enterprise controls (coming soon)" },
    ],
  },
];

const FREE_USAGE = [
  { label: "Project workspaces", used: 1, total: 1 },
  { label: "Revisions this month", used: 3, total: 5 },
  { label: "PDF exports", used: 0, total: 0 },
  { label: "Architecture alternatives", used: 0, total: 0 },
];

const PAID_USAGE = [
  { label: "Project workspaces", used: 12, total: -1 },
  { label: "Revisions this month", used: 47, total: -1 },
  { label: "PDF exports", used: 8, total: -1 },
  { label: "Architecture alternatives", used: 5, total: -1 },
];

type Props = {
  onNavigate: (r: Route, param?: string) => void;
};

export default function SubscriptionPage({ onNavigate }: Props) {
  const { sub, setSub } = useSubscription();
  const [billing, setBilling] = useState<Billing>("monthly");
  const [confirmCancel, setConfirmCancel] = useState(false);

  const currentPlanKey: PlanKey =
    sub.kind === "free" ? "free" : sub.plan;

  function handleCancel() {
    setSub(cancelSubscription(sub));
    setConfirmCancel(false);
  }
  function handleReactivate() {
    setSub(reactivateSubscription(sub));
  }

  return (
    <div className="page-enter">
      <section className="hero" aria-label="Subscription">
        <span className="eyebrow">Subscription</span>
        <h1 className="hero-title">
          {sub.kind === "free"
            ? "Manage your plan."
            : sub.kind === "active"
            ? `You're on Quantiliom ${planLabel(sub.plan)}.`
            : `Subscription cancelled.`}
        </h1>
        <p className="hero-sub">
          {sub.kind === "free"
            ? "You're on the Free plan today. Upgrade any time to unlock unlimited projects, PDF exports, and architecture alternatives. Cancel whenever — we won't make it weird."
            : sub.kind === "active"
            ? "Your subscription details, billing schedule, and the option to cancel future charges are all below."
            : `You'll keep ${planLabel(sub.plan)} access until ${formatDate(sub.endsAt)}. After that your workspace switches back to Free. No future charges.`}
        </p>
      </section>

      {/* ── Current plan ─────────────────────────────────────────────── */}
      {sub.kind === "free" ? (
        <CurrentPlanFree onUpgrade={() => onNavigate("upgrade", "pro")} />
      ) : sub.kind === "active" ? (
        <CurrentPlanActive
          sub={sub}
          confirmOpen={confirmCancel}
          onAskCancel={() => setConfirmCancel(true)}
          onAbortCancel={() => setConfirmCancel(false)}
          onConfirmCancel={handleCancel}
        />
      ) : (
        <CurrentPlanCancelled sub={sub} onReactivate={handleReactivate} />
      )}

      {/* ── Usage ────────────────────────────────────────────────────── */}
      <UsageSection sub={sub} />

      {/* ── Plan picker ──────────────────────────────────────────────── */}
      <section className="sub-section" id="available-plans" aria-label="Available plans">
        <div className="sub-section-head">
          <div>
            <h2 className="sub-section-title">
              {sub.kind === "free" ? "Pick what fits today." : "Switch plans"}
            </h2>
            <p className="sub-section-sub">
              {sub.kind === "free"
                ? "Switch up or down any time. Annual saves about 20% on Pro and Team."
                : "Upgrades take effect immediately. Downgrades apply at the end of the current period."}
            </p>
          </div>
          <BillingToggle billing={billing} onChange={setBilling} />
        </div>

        <div className="plans">
          {PLANS.map((p) => (
            <PlanCard
              key={p.key}
              plan={p}
              billing={billing}
              current={currentPlanKey}
              isCancelled={sub.kind === "cancelled"}
              onUpgrade={() =>
                p.key === "free"
                  ? undefined
                  : onNavigate("upgrade", p.key)
              }
            />
          ))}
        </div>
      </section>

      {/* ── Billing history ──────────────────────────────────────────── */}
      <BillingHistory sub={sub} />
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════
 * Current-plan cards (free / active / cancelled)
 * ═════════════════════════════════════════════════════════════════════ */

function CurrentPlanFree({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <section className="sub-current" aria-label="Current plan">
      <div className="sub-current-head">
        <div>
          <div className="sub-current-tag">Current plan</div>
          <div className="sub-current-name">
            Quantiliom <span>Free</span>
          </div>
          <p className="sub-current-sub">
            Renews never &mdash; you stay on Free for as long as you like. No
            card on file.
          </p>
        </div>
        <div className="sub-current-actions">
          <a href="#available-plans" className="btn-ghost-dark">
            Compare plans
          </a>
          <button
            type="button"
            className="btn-solid-dark"
            onClick={onUpgrade}
          >
            Upgrade
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </section>
  );
}

function CurrentPlanActive({
  sub,
  confirmOpen,
  onAskCancel,
  onAbortCancel,
  onConfirmCancel,
}: {
  sub: Extract<SubscriptionState, { kind: "active" }>;
  confirmOpen: boolean;
  onAskCancel: () => void;
  onAbortCancel: () => void;
  onConfirmCancel: () => void;
}) {
  const renewalTotal = useMemo(
    () => totalWithTax(sub.plan, sub.billing),
    [sub.plan, sub.billing]
  );
  return (
    <section className="sub-current" aria-label="Current plan">
      <div className="sub-current-head">
        <div>
          <div className="sub-current-tag">
            <span className="sub-status-dot sub-status-active" aria-hidden="true" />
            Active subscription
          </div>
          <div className="sub-current-name">
            Quantiliom <span>{planLabel(sub.plan)}</span>
          </div>
          <p className="sub-current-sub">
            Billed {billingLabel(sub.billing).toLowerCase()}. Renews{" "}
            {formatDate(sub.nextRenewalAt)} at ${renewalTotal.toFixed(2)}. Cancel
            anytime to stop future charges.
          </p>
        </div>
        <div className="sub-current-actions">
          <button
            type="button"
            className="btn-ghost-dark"
            onClick={onAskCancel}
            disabled={confirmOpen}
          >
            Cancel subscription
          </button>
          <button type="button" className="btn-solid-dark" disabled>
            Manage card
          </button>
        </div>
      </div>

      <InfoGrid
        cells={[
          { label: "Plan", value: `Quantiliom ${planLabel(sub.plan)}` },
          { label: "Billing cycle", value: billingLabel(sub.billing) },
          { label: "Started", value: formatDate(sub.startedAt) },
          { label: "Next renewal", value: formatDate(sub.nextRenewalAt) },
        ]}
      />

      {confirmOpen ? (
        <div className="sub-cancel-confirm" role="alertdialog" aria-labelledby="cancel-confirm-title">
          <div>
            <div className="sub-cancel-confirm-title" id="cancel-confirm-title">
              Cancel your Quantiliom {planLabel(sub.plan)} subscription?
            </div>
            <p className="sub-cancel-confirm-body">
              You&rsquo;ll keep full access until{" "}
              <strong>{formatDate(sub.nextRenewalAt)}</strong>. After that, your
              workspace switches back to Free. No future charges will be made.
            </p>
          </div>
          <div className="sub-cancel-confirm-actions">
            <button type="button" className="btn-ghost-dark" onClick={onAbortCancel}>
              Keep subscription
            </button>
            <button type="button" className="btn-solid-dark" onClick={onConfirmCancel}>
              Yes, cancel
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function CurrentPlanCancelled({
  sub,
  onReactivate,
}: {
  sub: Extract<SubscriptionState, { kind: "cancelled" }>;
  onReactivate: () => void;
}) {
  return (
    <section className="sub-current sub-cancelled" aria-label="Cancelled subscription">
      <div className="sub-current-head">
        <div>
          <div className="sub-current-tag sub-current-tag-warn">
            <span className="sub-status-dot sub-status-cancelled" aria-hidden="true" />
            Subscription cancelled
          </div>
          <div className="sub-current-name">
            Quantiliom <span>{planLabel(sub.plan)}</span>
          </div>
          <p className="sub-current-sub">
            Your subscription will not auto-renew. You keep {planLabel(sub.plan)} access
            until <strong>{formatDate(sub.endsAt)}</strong>, then your workspace switches
            back to Free.
          </p>
        </div>
        <div className="sub-current-actions">
          <button type="button" className="btn-solid-dark" onClick={onReactivate}>
            Reactivate
          </button>
        </div>
      </div>

      <InfoGrid
        cells={[
          { label: "Plan", value: `Quantiliom ${planLabel(sub.plan)}` },
          { label: "Billing cycle", value: billingLabel(sub.billing) },
          { label: "Started", value: formatDate(sub.startedAt) },
          { label: "Access ends", value: formatDate(sub.endsAt) },
        ]}
      />
    </section>
  );
}

function InfoGrid({ cells }: { cells: { label: string; value: string }[] }) {
  return (
    <div className="sub-info-grid">
      {cells.map((c) => (
        <div className="sub-info-cell" key={c.label}>
          <div className="sub-info-label">{c.label}</div>
          <div className="sub-info-value">{c.value}</div>
        </div>
      ))}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════
 * Usage section (different for free vs. paid)
 * ═════════════════════════════════════════════════════════════════════ */

function UsageSection({ sub }: { sub: SubscriptionState }) {
  const items = sub.kind === "free" ? FREE_USAGE : PAID_USAGE;
  const title =
    sub.kind === "free"
      ? "Your Free-plan usage this month"
      : "Your usage this period";

  return (
    <section className="sub-section" aria-label="Usage">
      <div className="sub-section-head">
        <div>
          <h2 className="sub-section-title">{title}</h2>
          <p className="sub-section-sub">
            {sub.kind === "free"
              ? "Most workspaces hit the Free-plan caps within a week. Upgrade to remove them."
              : "All paid plans include unlimited projects and revisions. We just show you what you've actually used."}
          </p>
        </div>
      </div>

      <div className="sub-usage">
        {items.map((u) => (
          <UsageCell key={u.label} item={u} />
        ))}
      </div>
    </section>
  );
}

function UsageCell({
  item,
}: {
  item: { label: string; used: number; total: number };
}) {
  // total = -1 means "unlimited" on paid plans.
  if (item.total === -1) {
    return (
      <div className="sub-usage-cell">
        <div className="sub-usage-label">{item.label}</div>
        <div className="sub-usage-val">
          <strong>{item.used}</strong>
          <span className="sub-usage-of">used</span>
        </div>
        <div className="sub-usage-bar" aria-hidden="true">
          <span className="sub-usage-fill sub-usage-unlimited" />
        </div>
      </div>
    );
  }
  if (item.total === 0) {
    return (
      <div className="sub-usage-cell">
        <div className="sub-usage-label">{item.label}</div>
        <div className="sub-usage-val">
          <span className="sub-usage-locked">Not on Free</span>
        </div>
        <div className="sub-usage-bar is-locked" aria-hidden="true">
          <span className="sub-usage-fill" style={{ width: "0%" }} />
        </div>
      </div>
    );
  }
  const pct = Math.min(100, Math.round((item.used / item.total) * 100));
  return (
    <div className="sub-usage-cell">
      <div className="sub-usage-label">{item.label}</div>
      <div className="sub-usage-val">
        <strong>{item.used}</strong>
        <span className="sub-usage-of">/ {item.total}</span>
      </div>
      <div className="sub-usage-bar" aria-hidden="true">
        <span className="sub-usage-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════
 * Billing toggle (in the plan-picker header)
 * ═════════════════════════════════════════════════════════════════════ */

function BillingToggle({
  billing,
  onChange,
}: {
  billing: Billing;
  onChange: (b: Billing) => void;
}) {
  return (
    <div className="billing-wrap" style={{ margin: 0 }}>
      <div className="billing-toggle">
        {(["monthly", "annual"] as const).map((p) => (
          <button
            key={p}
            type="button"
            className={"billing-opt" + (p === billing ? " active" : "")}
            onClick={() => onChange(p)}
          >
            {p === "monthly" ? "Monthly" : "Annual"}
          </button>
        ))}
      </div>
      <span className={"save-badge" + (billing === "annual" ? " visible" : "")}>
        Save 20%
      </span>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════
 * Plan card (state-aware: shows Current / Upgrade / Switch / —)
 * ═════════════════════════════════════════════════════════════════════ */

function PlanCard({
  plan,
  billing,
  current,
  isCancelled,
  onUpgrade,
}: {
  plan: Plan;
  billing: Billing;
  current: PlanKey;
  isCancelled: boolean;
  onUpgrade: () => void;
}) {
  const isCurrent = plan.key === current;
  const isAnnual = billing === "annual";
  const userIsOnPaid = current === "pro" || current === "team";

  // Which CTA text + variant to show.
  let ctaNode: React.ReactNode;
  if (isCurrent && !isCancelled) {
    ctaNode = (
      <span className="sub-plan-current">
        <CheckIcon size={13} /> Current plan
      </span>
    );
  } else if (isCurrent && isCancelled) {
    ctaNode = (
      <span className="sub-plan-current sub-plan-current-warn">
        <CheckIcon size={13} /> Until period ends
      </span>
    );
  } else if (plan.key === "free") {
    // Free plan card when user is paying — no CTA, just a note.
    ctaNode = userIsOnPaid ? (
      <span className="sub-plan-note">Cancel above to downgrade</span>
    ) : null;
  } else {
    ctaNode = (
      <button
        type="button"
        className={plan.pro ? "btn-solid-orange" : "btn-solid-dark"}
        onClick={onUpgrade}
      >
        {userIsOnPaid ? `Switch to ${plan.name}` : `Upgrade to ${plan.name}`}
        <span aria-hidden="true">→</span>
      </button>
    );
  }

  return (
    <div className={"plan" + (plan.pro ? " pro" : "")}>
      <span className="plan-tier">{plan.tier}</span>
      <div className="plan-name">{plan.name}</div>
      <div className="plan-price-row">
        <span className="plan-price-val">
          {isAnnual ? plan.annualPrice : plan.monthlyPrice}
        </span>
        <span className="plan-price-per">{plan.period}</span>
        <span
          className={"plan-price-orig" + (isAnnual && plan.annualOrig ? " show" : "")}
        >
          {isAnnual && plan.annualOrig ? plan.annualOrig : ""}
        </span>
      </div>
      <p className="plan-tagline">{plan.tagline}</p>
      <div className="plan-sep" />
      <ul className="plan-feats">
        {plan.features.map((f) => (
          <li key={f.text} className="plan-feat">
            <span className={"feat-icon " + (f.ok ? "y" : "n")} aria-hidden="true">
              {f.ok ? "✓" : "✗"}
            </span>
            <span>{f.text}</span>
          </li>
        ))}
      </ul>
      <div className="plan-annual-note">
        {isAnnual && plan.annualNote ? plan.annualNote : " "}
      </div>

      <div className="sub-plan-action">{ctaNode}</div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════
 * Billing history (real-looking entry once active/cancelled)
 * ═════════════════════════════════════════════════════════════════════ */

function BillingHistory({ sub }: { sub: SubscriptionState }) {
  if (sub.kind === "free") {
    return (
      <section className="sub-section" aria-label="Billing history">
        <div className="sub-section-head">
          <div>
            <h2 className="sub-section-title">Billing history</h2>
            <p className="sub-section-sub">
              Receipts, invoices, and payment status appear here once you upgrade
              to a paid plan.
            </p>
          </div>
        </div>
        <div className="sub-history-empty">
          <div className="sub-history-mark" aria-hidden="true">
            <ReceiptIcon size={18} />
          </div>
          <div>
            <div className="sub-history-title">No invoices yet</div>
            <div className="sub-history-sub">
              Your invoices will be downloadable as PDF the moment you have one.
            </div>
          </div>
        </div>
      </section>
    );
  }

  const subtotal = priceForCycle(sub.plan, sub.billing);
  const tax = +(subtotal * TAX_RATE).toFixed(2);
  const total = +(subtotal + tax).toFixed(2);

  return (
    <section className="sub-section" aria-label="Billing history">
      <div className="sub-section-head">
        <div>
          <h2 className="sub-section-title">Billing history</h2>
          <p className="sub-section-sub">
            Receipts and PDF invoices for every charge to your account.
          </p>
        </div>
      </div>

      <div className="sub-invoice-list">
        <div className="sub-invoice">
          <div className="sub-invoice-left">
            <div className="sub-invoice-mark" aria-hidden="true">
              <ReceiptIcon size={16} />
            </div>
            <div>
              <div className="sub-invoice-title">
                Quantiliom {planLabel(sub.plan)} &mdash; {billingLabel(sub.billing).toLowerCase()}
              </div>
              <div className="sub-invoice-meta">
                {formatDate(sub.startedAt)} &middot; INV-
                {sub.startedAt.replace(/[^\d]/g, "").slice(0, 8)}
              </div>
            </div>
          </div>
          <div className="sub-invoice-right">
            <span className="sub-invoice-amount">${total.toFixed(2)}</span>
            <span className="sub-invoice-status">Paid</span>
            <button type="button" className="btn-ghost-dark sub-invoice-pdf" disabled>
              PDF
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
