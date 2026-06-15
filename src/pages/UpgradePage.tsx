import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import type { Route } from "../lib/router";
import {
  activateSubscription,
  TAX_RATE,
  useSubscription,
} from "../lib/subscription";
import {
  ArrowRightIcon,
  CheckIcon,
  LockIcon,
  ShieldCheckIcon,
} from "../components/icons";

type PlanKey = "pro" | "team";
type Billing = "monthly" | "annual";
type Brand = "visa" | "mc" | "amex" | "disc" | "default";

type PaidPlan = {
  key: PlanKey;
  name: string;
  tier: string;
  tagline: string;
  monthly: number;
  annual: number;
  features: string[];
};

const PLANS: Record<PlanKey, PaidPlan> = {
  pro: {
    key: "pro",
    name: "Pro",
    tier: "Most popular",
    tagline: "Full architecture workspace for solo builders.",
    monthly: 29,
    annual: 276,
    features: [
      "Unlimited projects",
      "Full architecture generation",
      "2–3 architecture alternatives",
      "Unlimited chatbot revisions",
      "PDF documentation export",
      "Cost optimization reports",
      "Security recommendations",
      "Full tech stack comparisons",
    ],
  },
  team: {
    key: "team",
    name: "Team",
    tier: "For teams",
    tagline: "Versioned, shared architecture workspaces.",
    monthly: 79,
    annual: 756,
    features: [
      "Everything in Pro",
      "Up to 5 team members",
      "Shared project workspaces",
      "Collaborative revision history",
      "Team comments & annotations",
      "Organization workspace",
      "Priority support",
    ],
  },
};

type Props = {
  planKey: PlanKey;
  prefilledEmail: string;
  onNavigate: (r: Route, param?: string) => void;
};

export default function UpgradePage({ planKey, prefilledEmail, onNavigate }: Props) {
  const plan = PLANS[planKey];
  const { setSub } = useSubscription();

  const [billing, setBilling] = useState<Billing>("monthly");
  const [email, setEmail] = useState(prefilledEmail);
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [postal, setPostal] = useState("");
  const [country, setCountry] = useState("Türkiye");
  const [saveCard, setSaveCard] = useState(true);
  const [flipped, setFlipped] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const brand = useMemo<Brand>(() => detectBrand(number), [number]);

  const totals = useMemo(() => {
    const subtotal = billing === "annual" ? plan.annual : plan.monthly;
    const tax = +(subtotal * TAX_RATE).toFixed(2);
    const total = +(subtotal + tax).toFixed(2);
    return { subtotal, tax, total };
  }, [billing, plan]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting || done) return;
    setSubmitting(true);
    // UI mockup only — no real charge. Fake a brief processing state then
    // show the "demo" success card. After a beat we bounce back to the
    // subscription page so the user keeps moving through the app.
    window.setTimeout(() => {
      setSubmitting(false);
      setDone(true);
      // Persist the subscription so SubscriptionPage shows the active
      // state with real dates the moment the user lands there.
      setSub(activateSubscription(plan.key, billing));
      window.setTimeout(() => onNavigate("subscription"), 2400);
    }, 1100);
  }

  return (
    <div className="page-enter upgrade-page">
      <header className="upgrade-top">
        <button
          type="button"
          className="upgrade-back"
          onClick={() => onNavigate("subscription")}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Back to subscription
        </button>
        <div className="upgrade-step">
          <span className="upgrade-step-dot is-active" />
          <span>Payment</span>
          <span className="upgrade-step-sep" aria-hidden="true">·</span>
          <span className="upgrade-step-muted">Confirmation</span>
        </div>
      </header>

      <div className="upgrade-grid">
        {/* ─────────────────────────── LEFT — visual + summary ───────────────────────────── */}
        <aside className="upgrade-left" aria-label="Plan summary">
          <div className="upgrade-eyebrow">
            <span className="upgrade-eyebrow-dot" /> Upgrading to
          </div>
          <h1 className="upgrade-headline">
            Quantiliom <span className="upgrade-headline-accent">{plan.name}</span>
          </h1>
          <p className="upgrade-tagline">{plan.tagline}</p>

          {/* 3D CARD VISUAL */}
          <CardVisual
            number={number}
            name={name}
            expiry={expiry}
            cvc={cvc}
            brand={brand}
            flipped={flipped}
          />

          <ul className="upgrade-features" aria-label="What you unlock">
            {plan.features.slice(0, 6).map((f) => (
              <li key={f}>
                <span className="upgrade-feat-check" aria-hidden="true">
                  <CheckIcon size={12} />
                </span>
                <span>{f}</span>
              </li>
            ))}
          </ul>

          <div className="upgrade-trust">
            <div className="upgrade-trust-item">
              <ShieldCheckIcon size={14} />
              <span>256-bit TLS</span>
            </div>
            <div className="upgrade-trust-item">
              <LockIcon size={14} />
              <span>PCI-DSS Level 1</span>
            </div>
            <div className="upgrade-trust-item">
              <CheckIcon size={14} />
              <span>Cancel anytime</span>
            </div>
          </div>
        </aside>

        {/* ─────────────────────────── RIGHT — checkout form ───────────────────────────── */}
        <section className="upgrade-right" aria-label="Payment details">
          {done ? (
            <SuccessCard
              planName={plan.name}
              billing={billing}
              totalCharged={formatPrice(totals.total)}
              onContinue={() => onNavigate("subscription")}
            />
          ) : (
            <form className="upgrade-form" onSubmit={handleSubmit} noValidate>
              <header className="upgrade-form-head">
                <h2>Complete your upgrade</h2>
                <p>
                  This is a UI preview &mdash; nothing is actually charged. Future
                  versions will route payment through Stripe.
                </p>
              </header>

              <CycleSwitcher billing={billing} onChange={setBilling} plan={plan} />

              <fieldset className="upgrade-fieldset">
                <legend>Account</legend>
                <Field
                  id="up-email"
                  label="Email for receipts"
                  value={email}
                  onChange={setEmail}
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                />
              </fieldset>

              <fieldset className="upgrade-fieldset">
                <legend>Card details</legend>

                <Field
                  id="up-name"
                  label="Cardholder name"
                  value={name}
                  onChange={(v) => setName(v.toUpperCase())}
                  autoComplete="cc-name"
                  placeholder="AS IT APPEARS ON THE CARD"
                  uppercaseInput
                />

                <Field
                  id="up-number"
                  label="Card number"
                  value={number}
                  onChange={(v) => setNumber(formatCardNumber(v))}
                  autoComplete="cc-number"
                  inputMode="numeric"
                  placeholder="•••• •••• •••• ••••"
                  rightSlot={<BrandChipRow active={brand} />}
                />

                <div className="upgrade-row-3">
                  <Field
                    id="up-expiry"
                    label="Expiry"
                    value={expiry}
                    onChange={(v) => setExpiry(formatExpiry(v))}
                    autoComplete="cc-exp"
                    inputMode="numeric"
                    placeholder="MM / YY"
                  />
                  <Field
                    id="up-cvc"
                    label="CVC"
                    value={cvc}
                    onChange={(v) => setCvc(v.replace(/\D/g, "").slice(0, 4))}
                    autoComplete="cc-csc"
                    inputMode="numeric"
                    placeholder="•••"
                    onFocus={() => setFlipped(true)}
                    onBlur={() => setFlipped(false)}
                  />
                  <Field
                    id="up-postal"
                    label="Postal code"
                    value={postal}
                    onChange={setPostal}
                    autoComplete="postal-code"
                    placeholder="34000"
                  />
                </div>

                <div className="upgrade-field">
                  <label className="upgrade-label" htmlFor="up-country">
                    Country
                  </label>
                  <select
                    id="up-country"
                    className="upgrade-input upgrade-select"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <label className="upgrade-checkbox">
                  <input
                    type="checkbox"
                    checked={saveCard}
                    onChange={(e) => setSaveCard(e.target.checked)}
                  />
                  <span>Save this card for future billing</span>
                </label>
              </fieldset>

              <div className="upgrade-summary">
                <div className="upgrade-summary-head">
                  <span>Order summary</span>
                  <span className="upgrade-summary-cycle">
                    {billing === "annual" ? "Annual" : "Monthly"}
                  </span>
                </div>
                <div className="upgrade-summary-row">
                  <span>
                    Quantiliom {plan.name}
                    <span className="upgrade-summary-sub">
                      {" "}
                      ·{" "}
                      {billing === "annual"
                        ? "Billed yearly"
                        : "Billed monthly"}
                    </span>
                  </span>
                  <span className="upgrade-summary-val">
                    {formatPrice(totals.subtotal)}
                  </span>
                </div>
                <div className="upgrade-summary-row muted">
                  <span>VAT (20%)</span>
                  <span>{formatPrice(totals.tax)}</span>
                </div>
                <div className="upgrade-summary-sep" />
                <div className="upgrade-summary-row total">
                  <span>Total today</span>
                  <span>
                    <strong>{formatPrice(totals.total)}</strong>
                  </span>
                </div>
              </div>

              <p className="upgrade-summary-note">
                {billing === "annual"
                  ? `Renews ${nextYearISO()} at ${formatPrice(totals.total)}. Cancel up to 24h before renewal — you keep ${plan.name} access until then.`
                  : `Renews ${nextMonthISO()} at ${formatPrice(totals.total)}. Cancel anytime from Subscription — you keep ${plan.name} access until the period ends.`}
              </p>

              <button
                type="submit"
                className="upgrade-pay"
                disabled={submitting}
              >
                <LockIcon size={14} />
                <span>
                  {submitting
                    ? "Processing…"
                    : `Complete payment — ${formatPrice(totals.total)}`}
                </span>
                {!submitting ? <ArrowRightIcon size={14} /> : null}
              </button>

              <p className="upgrade-legal">
                By upgrading, you authorise Quantiliom to charge your card per
                the schedule above. You agree to our <a href="#">Terms</a> and{" "}
                <a href="#">Privacy Policy</a>. Demo only &mdash; no charge.
              </p>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────
 * Card visual — flat, no resting tilt, no parallax. Float + flip only.
 * ──────────────────────────────────────────────────────────────────────── */
function CardVisual({
  number,
  name,
  expiry,
  cvc,
  brand,
  flipped,
}: {
  number: string;
  name: string;
  expiry: string;
  cvc: string;
  brand: Brand;
  flipped: boolean;
}) {
  const displayNumber = renderMaskedNumber(number);
  const displayName = name || "FULL NAME";
  const displayExpiry = expiry || "MM/YY";
  const displayCvc = cvc || "•••";

  return (
    <div className="card-visual" aria-hidden="true">
      <div className={"card-3d" + (flipped ? " is-flipped" : "")}>
        {/* FRONT */}
        <div className="card-face card-front">
          <div className="card-shine" />
          <div className="card-front-top">
            <div className="card-brand">
              <div className="card-brand-mark">Q</div>
              <div className="card-brand-name">
                Quantiliom
                <span className="card-brand-sub">Architect Card</span>
              </div>
            </div>
            <CardBrandBadge brand={brand} />
          </div>

          <div className="card-chip" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>

          <div className="card-number">{displayNumber}</div>

          <div className="card-front-bottom">
            <div className="card-data">
              <span className="card-data-label">Cardholder</span>
              <span className="card-data-value">{displayName}</span>
            </div>
            <div className="card-data">
              <span className="card-data-label">Expires</span>
              <span className="card-data-value">{displayExpiry}</span>
            </div>
          </div>
        </div>

        {/* BACK */}
        <div className="card-face card-back">
          <div className="card-mag" />
          <div className="card-cvc-row">
            <span className="card-cvc-label">CVC</span>
            <span className="card-cvc-box">{displayCvc}</span>
          </div>
          <div className="card-back-foot">
            <div className="card-brand-name">
              Quantiliom
              <span className="card-brand-sub">Architect Card</span>
            </div>
            <CardBrandBadge brand={brand} />
          </div>
        </div>
      </div>
      <div className="card-shadow" aria-hidden="true" />
    </div>
  );
}

function CardBrandBadge({ brand }: { brand: Brand }) {
  if (brand === "visa") return <span className="brand-chip brand-visa lg">VISA</span>;
  if (brand === "amex") return <span className="brand-chip brand-amex lg">AMEX</span>;
  if (brand === "disc") return <span className="brand-chip brand-disc lg">DISCOVER</span>;
  if (brand === "mc") {
    return (
      <span className="brand-chip brand-mc lg" aria-label="Mastercard">
        <span className="brand-mc-l" />
        <span className="brand-mc-r" />
      </span>
    );
  }
  return <span className="brand-chip brand-default lg">QUAN</span>;
}

function BrandChipRow({ active }: { active: Brand }) {
  const items: { key: Brand; node: React.ReactNode }[] = [
    { key: "visa", node: <span className="brand-chip brand-visa">VISA</span> },
    {
      key: "mc",
      node: (
        <span className="brand-chip brand-mc" aria-label="Mastercard">
          <span className="brand-mc-l" />
          <span className="brand-mc-r" />
        </span>
      ),
    },
    { key: "amex", node: <span className="brand-chip brand-amex">AMEX</span> },
    { key: "disc", node: <span className="brand-chip brand-disc">DISC</span> },
  ];
  return (
    <div className="upgrade-brand-row" aria-hidden="true">
      {items.map((b) => (
        <span
          key={b.key}
          className={"upgrade-brand-slot" + (active === b.key ? " is-active" : "")}
        >
          {b.node}
        </span>
      ))}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────
 * Form field — small wrapper around <input/> with consistent styling
 * ──────────────────────────────────────────────────────────────────────── */
function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  inputMode,
  placeholder,
  rightSlot,
  onFocus,
  onBlur,
  uppercaseInput,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  inputMode?: "numeric" | "text" | "tel" | "email" | "url" | "decimal" | "search" | "none";
  placeholder?: string;
  rightSlot?: React.ReactNode;
  onFocus?: () => void;
  onBlur?: () => void;
  uppercaseInput?: boolean;
}) {
  return (
    <div className="upgrade-field">
      <div className="upgrade-label-row">
        <label className="upgrade-label" htmlFor={id}>
          {label}
        </label>
        {rightSlot}
      </div>
      <input
        id={id}
        className={"upgrade-input" + (uppercaseInput ? " is-upper" : "")}
        type={type}
        autoComplete={autoComplete}
        inputMode={inputMode}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
      />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────
 * Billing cycle switcher (renders inside the form, not just plan picker)
 * ──────────────────────────────────────────────────────────────────────── */
function CycleSwitcher({
  billing,
  onChange,
  plan,
}: {
  billing: Billing;
  onChange: (b: Billing) => void;
  plan: PaidPlan;
}) {
  const monthlyTotal = plan.monthly * 12;
  const annualSave = monthlyTotal - plan.annual;
  return (
    <div className="upgrade-cycle">
      <div className="upgrade-cycle-head">
        <span>Billing cycle</span>
        <span className="upgrade-cycle-save">
          Save {formatPrice(annualSave)} with annual
        </span>
      </div>
      <div className="upgrade-cycle-options">
        {(["monthly", "annual"] as const).map((b) => {
          const active = b === billing;
          const price = b === "annual" ? plan.annual : plan.monthly;
          const per = b === "annual" ? "/ year" : "/ month";
          return (
            <button
              key={b}
              type="button"
              className={"upgrade-cycle-opt" + (active ? " is-active" : "")}
              onClick={() => onChange(b)}
              aria-pressed={active}
            >
              <span className="upgrade-cycle-name">
                {b === "annual" ? "Annual" : "Monthly"}
                {b === "annual" ? <span className="upgrade-cycle-badge">−20%</span> : null}
              </span>
              <span className="upgrade-cycle-price">
                {formatPrice(price)} <span>{per}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────
 * Success state (replaces the form after submit)
 * ──────────────────────────────────────────────────────────────────────── */
function SuccessCard({
  planName,
  billing,
  totalCharged,
  onContinue,
}: {
  planName: string;
  billing: Billing;
  totalCharged: string;
  onContinue: () => void;
}) {
  useEffect(() => {
    /* parent owns the timer */
  }, []);
  return (
    <div className="upgrade-success" role="status">
      <div className="upgrade-success-mark" aria-hidden="true">
        <CheckIcon size={28} />
      </div>
      <div className="upgrade-success-title">You&rsquo;re on {planName}.</div>
      <p className="upgrade-success-sub">
        We pretended to charge {totalCharged} ({billing}). In a real run we&rsquo;d
        send a receipt to your inbox. Taking you back to Subscription…
      </p>
      <button type="button" className="btn-solid-dark" onClick={onContinue}>
        Open dashboard
        <ArrowRightIcon size={14} />
      </button>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────
 * Helpers
 * ──────────────────────────────────────────────────────────────────────── */
const COUNTRIES = [
  "Türkiye",
  "United States",
  "United Kingdom",
  "Germany",
  "Netherlands",
  "France",
  "Spain",
  "Italy",
  "Canada",
  "Australia",
  "Brazil",
  "Japan",
  "India",
];

function formatCardNumber(raw: string): string {
  return raw
    .replace(/\D/g, "")
    .slice(0, 19)
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

function formatExpiry(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length < 3) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function detectBrand(input: string): Brand {
  const digits = input.replace(/\D/g, "");
  if (!digits) return "default";
  if (digits.startsWith("4")) return "visa";
  if (digits.startsWith("34") || digits.startsWith("37")) return "amex";
  if (
    digits.startsWith("5") ||
    /^2[2-7]/.test(digits)
  )
    return "mc";
  if (digits.startsWith("6")) return "disc";
  return "default";
}

function renderMaskedNumber(input: string): string {
  const digits = input.replace(/\D/g, "");
  const padded = digits.padEnd(16, "•").slice(0, 16);
  return padded.replace(/(.{4})/g, "$1 ").trim();
}

function formatPrice(n: number): string {
  return `$${n.toFixed(2)}`;
}

function nextMonthISO(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function nextYearISO(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
