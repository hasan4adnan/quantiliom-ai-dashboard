import { useMemo } from "react";
import {
  asBool,
  asObject,
  asString,
  asStringArray,
  prettyEnum,
} from "../lib/architectureResult";

/**
 * Workspace Requirements page (Step 9r).
 *
 * Shows the normalized product requirements that the architecture stage
 * consumed. Read-only — no API call, no persistence, no raw JSON. The
 * input is the same `requirements` payload OnboardingFlow already
 * threaded into `WorkspaceState.requirements`, so this view runs against
 * existing in-memory state.
 *
 * Layout:
 *   1. Header chips (Domain / Scale / Budget / Time to market)
 *   2. Product brief card (refinedSummary)
 *   3. Core requirements grid (one card per requirement field that has
 *      a meaningful value)
 *   4. Integrations (chips)
 *   5. Tech preferences (chips)
 *   6. Assumptions (list)
 *   7. Unresolved open items (list with calm empty state)
 */

type Props = {
  requirements: unknown;
};

/* ── Unwrap + normalize ──────────────────────────────────────────────── */

/**
 * Accept the requirements object directly or under a wrapper key. Returns
 * the inner object if we can find one, otherwise null so the board can
 * show a calm empty state.
 */
function unwrapRequirements(input: unknown): Record<string, unknown> | null {
  const obj = asObject(input);
  if (!obj) return null;
  if (looksLikeRequirements(obj)) return obj;
  const wrapperKeys = [
    "requirements",
    "normalizedRequirements",
    "requirementSpec",
    "spec",
  ];
  for (const key of wrapperKeys) {
    const nested = asObject(obj[key]);
    if (nested && looksLikeRequirements(nested)) return nested;
  }
  return obj;
}

function looksLikeRequirements(o: Record<string, unknown>): boolean {
  return (
    "domain" in o ||
    "refinedSummary" in o ||
    "scale" in o ||
    "techPreferences" in o ||
    "integrations" in o ||
    "assumptions" in o
  );
}

function pickSummary(o: Record<string, unknown>): string | null {
  return (
    asString(o.refinedSummary) ??
    asString(o.summary) ??
    asString(o.refined_summary) ??
    asString(o.productSummary) ??
    asString(o.description)
  );
}

function pickEnum(o: Record<string, unknown>, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = asString(o[k]);
    if (v && v !== "unknown") return v;
    if (v === "unknown") return "unknown";
  }
  return null;
}

function yesNoCell(v: boolean | null): string | null {
  if (v === null) return null;
  return v ? "Yes" : "No";
}

/* ── Card model ─────────────────────────────────────────────────────── */

type RequirementCard = {
  key: string;
  label: string;
  value: string | null;
  /** Extra labelled values to render under the main value (e.g. providers). */
  chips: string[];
  /** Short prose hint shown below the value (e.g. raw user estimate). */
  hint: string | null;
};

function buildCards(r: Record<string, unknown>): RequirementCard[] {
  const cards: RequirementCard[] = [];
  const push = (
    key: string,
    label: string,
    value: string | null,
    chips: string[] = [],
    hint: string | null = null
  ) => {
    if (value === null && chips.length === 0 && !hint) return;
    cards.push({ key, label, value, chips, hint });
  };

  const domain = pickEnum(r, "domain");
  push(
    "domain",
    "Domain",
    domain ? prettyEnum(domain) ?? domain : null
  );

  // Scale: userBucket + optional rawUserEstimate.
  const scale = asObject(r.scale);
  if (scale) {
    const bucket = pickEnum(scale, "userBucket", "bucket");
    const raw = asString(scale.rawUserEstimate) ?? asString(scale.estimate);
    push(
      "scale",
      "Scale",
      bucket ? prettyEnum(bucket) ?? bucket : null,
      [],
      raw
    );
  }

  const realtime = asBool(r.realtime);
  push("realtime", "Realtime", yesNoCell(realtime));

  // Payments: required flag + providers chip list.
  const payments = asObject(r.payments);
  if (payments) {
    const required = asBool(payments.required);
    const providers = asStringArray(payments.providers);
    push(
      "payments",
      "Payments",
      yesNoCell(required),
      required === false ? [] : providers
    );
  }

  // Mobile: required flag + platforms chip list.
  const mobile = asObject(r.mobile);
  if (mobile) {
    const required = asBool(mobile.required);
    const platforms = asStringArray(mobile.platforms).map(
      (p) => prettyEnum(p) ?? p
    );
    push(
      "mobile",
      "Mobile",
      yesNoCell(required),
      required === false ? [] : platforms
    );
  }

  // Media: a single uploads boolean today.
  const media = asObject(r.media);
  if (media) {
    push("media", "Media uploads", yesNoCell(asBool(media.uploads)));
  }

  push("notifications", "Notifications", yesNoCell(asBool(r.notifications)));
  push("adminPanel", "Admin panel", yesNoCell(asBool(r.adminPanel)));
  push("analytics", "Analytics", yesNoCell(asBool(r.analytics)));

  // Security: sensitivity + compliance chips.
  const security = asObject(r.security);
  if (security) {
    const sensitivity = pickEnum(security, "sensitivity");
    const compliance = asStringArray(security.compliance);
    push(
      "security",
      "Security",
      sensitivity ? prettyEnum(sensitivity) ?? sensitivity : null,
      compliance
    );
  }

  const cloud = pickEnum(r, "preferredCloud", "cloud");
  push(
    "preferredCloud",
    "Preferred cloud",
    cloud ? prettyEnum(cloud) ?? cloud : null
  );

  const budget = pickEnum(r, "budgetLevel", "budget");
  push(
    "budgetLevel",
    "Budget",
    budget ? prettyEnum(budget) ?? budget : null
  );

  const ttm = pickEnum(r, "timeToMarket", "time_to_market");
  push(
    "timeToMarket",
    "Time to market",
    ttm ? prettyEnum(ttm) ?? ttm : null
  );

  return cards;
}

/* ── Component ──────────────────────────────────────────────────────── */

export default function RequirementsBoard({ requirements }: Props) {
  const r = useMemo(() => unwrapRequirements(requirements), [requirements]);

  if (!r) {
    return (
      <section className="requirements-board" aria-label="Requirements">
        <header className="requirements-board-header">
          <span className="requirements-board-eyebrow">Requirements</span>
          <h1 className="requirements-board-title">Requirements</h1>
          <p className="requirements-board-sub">
            Normalized product requirements used to generate this architecture.
          </p>
        </header>
        <div className="req-empty" role="status">
          Requirements data is not available for this run.
        </div>
      </section>
    );
  }

  const summary = pickSummary(r);
  const cards = buildCards(r);
  const integrations = asStringArray(r.integrations);
  const techPreferences = asStringArray(r.techPreferences);
  const assumptions = asStringArray(r.assumptions);
  const unresolved = asStringArray(r.unresolved);

  const domain = pickEnum(r, "domain");
  const scaleBucket = pickEnum(asObject(r.scale) ?? {}, "userBucket");
  const budget = pickEnum(r, "budgetLevel");
  const ttm = pickEnum(r, "timeToMarket");

  const chips: { label: string; value: string }[] = [];
  if (domain)
    chips.push({ label: "Domain", value: prettyEnum(domain) ?? domain });
  if (scaleBucket)
    chips.push({
      label: "Scale",
      value: prettyEnum(scaleBucket) ?? scaleBucket,
    });
  if (budget)
    chips.push({ label: "Budget", value: prettyEnum(budget) ?? budget });
  if (ttm)
    chips.push({ label: "Time to market", value: prettyEnum(ttm) ?? ttm });

  return (
    <section className="requirements-board" aria-label="Requirements">
      <header className="requirements-board-header">
        <span className="requirements-board-eyebrow">Requirements</span>
        <h1 className="requirements-board-title">Requirements</h1>
        <p className="requirements-board-sub">
          Normalized product requirements used to generate this architecture.
        </p>
        {chips.length > 0 ? (
          <div className="requirements-board-chips">
            {chips.map((c) => (
              <span key={c.label} className="architecture-canvas-chip">
                <span>{c.label}</span>
                <strong>{c.value}</strong>
              </span>
            ))}
          </div>
        ) : null}
      </header>

      {summary ? (
        <section className="req-brief-card" aria-label="Product brief">
          <span className="req-brief-eyebrow">Product brief</span>
          <p className="req-brief-text">{summary}</p>
        </section>
      ) : (
        <section className="req-brief-card req-brief-card--empty" aria-label="Product brief">
          <span className="req-brief-eyebrow">Product brief</span>
          <p className="req-brief-empty">
            No refined summary was returned for this run.
          </p>
        </section>
      )}

      {cards.length > 0 ? (
        <section
          className="req-grid-section"
          aria-label="Core requirements"
        >
          <div className="req-section-head">
            <span className="req-section-name">Core requirements</span>
            <span className="req-section-count">{cards.length}</span>
          </div>
          <ul className="req-grid">
            {cards.map((c) => (
              <li key={c.key} className="req-card">
                <span className="req-card-label">{c.label}</span>
                {c.value ? (
                  <span className="req-card-value">{c.value}</span>
                ) : null}
                {c.chips.length > 0 ? (
                  <ul className="req-card-chips">
                    {c.chips.map((chip) => (
                      <li key={chip} className="req-chip">
                        {chip}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {c.hint ? (
                  <span className="req-card-hint">“{c.hint}”</span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <ChipListSection
        title="Integrations"
        items={integrations}
        emptyText="No third-party integrations were specified."
      />

      <ChipListSection
        title="Tech preferences"
        items={techPreferences}
        emptyText="No explicit tech preferences were stated."
      />

      <NoteListSection
        title="Assumptions"
        items={assumptions}
        emptyText="No defaulting assumptions were recorded for this run."
      />

      <NoteListSection
        title="Open items"
        items={unresolved}
        emptyText="No unresolved requirement gaps were returned for this run."
        variant="unresolved"
      />
    </section>
  );
}

/* ── Local building blocks ──────────────────────────────────────────── */

function ChipListSection({
  title,
  items,
  emptyText,
}: {
  title: string;
  items: string[];
  emptyText: string;
}) {
  return (
    <section className="req-chip-section" aria-label={title}>
      <div className="req-section-head">
        <span className="req-section-name">{title}</span>
        {items.length > 0 ? (
          <span className="req-section-count">{items.length}</span>
        ) : null}
      </div>
      {items.length > 0 ? (
        <ul className="req-chip-list">
          {items.map((it) => (
            <li key={it} className="req-chip req-chip--lg">
              {it}
            </li>
          ))}
        </ul>
      ) : (
        <div className="req-empty req-empty--inline" role="status">
          {emptyText}
        </div>
      )}
    </section>
  );
}

function NoteListSection({
  title,
  items,
  emptyText,
  variant,
}: {
  title: string;
  items: string[];
  emptyText: string;
  variant?: "unresolved";
}) {
  const listClass =
    "req-note-list" + (variant === "unresolved" ? " req-note-list--unresolved" : "");
  return (
    <section
      className={
        "req-note-section" +
        (variant === "unresolved" ? " req-note-section--unresolved" : "")
      }
      aria-label={title}
    >
      <div className="req-section-head">
        <span className="req-section-name">{title}</span>
        {items.length > 0 ? (
          <span className="req-section-count">{items.length}</span>
        ) : null}
      </div>
      {items.length > 0 ? (
        <ul className={listClass}>
          {items.map((it, i) => (
            <li key={`${variant ?? "n"}-${i}`} className="req-note">
              {it}
            </li>
          ))}
        </ul>
      ) : (
        <div className="req-empty req-empty--inline" role="status">
          {emptyText}
        </div>
      )}
    </section>
  );
}
