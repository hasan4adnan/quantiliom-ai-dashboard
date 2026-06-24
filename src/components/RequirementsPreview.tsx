/**
 * Compact, read-only preview of the normalized Requirements payload the
 * backend produced from the user's answers.
 *
 * We treat the value as `unknown` and use safe type guards before
 * reading any field — the engine's Requirements schema is the source of
 * truth and the dashboard should never crash if a field shows up as a
 * different shape than expected.
 */

type Props = {
  requirements: unknown;
  onBackToQuestions: () => void;
  onStartOver: () => void;
  /**
   * Called when the user clicks "Generate architecture". The parent owns
   * the POST to /api/jobs + polling so this component stays purely
   * presentational. When omitted, the button stays disabled.
   */
  onGenerateArchitecture?: () => void;
  /**
   * Set true while the architecture request is in flight (or about to
   * be). When true, the button shows a busy label and is non-interactive
   * to prevent duplicate submissions.
   */
  isGenerating?: boolean;
};

function asObject(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  return v as Record<string, unknown>;
}

function asString(v: unknown): string | null {
  return typeof v === "string" && v.trim().length > 0 ? v : null;
}

function asBool(v: unknown): boolean | null {
  return typeof v === "boolean" ? v : null;
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string" && x.length > 0);
}

function prettyEnum(v: string | null): string | null {
  if (!v) return null;
  return v
    .split("_")
    .map((p) => (p.length === 0 ? p : p[0]!.toUpperCase() + p.slice(1)))
    .join(" ");
}

function yesNo(v: boolean | null): string {
  if (v === null) return "—";
  return v ? "Yes" : "No";
}

type Facet = { label: string; value: string };

function buildFacets(req: Record<string, unknown>): Facet[] {
  const facets: Facet[] = [];

  const domain = asString(req.domain);
  if (domain) facets.push({ label: "Domain", value: prettyEnum(domain) ?? domain });

  const scale = asObject(req.scale);
  const bucket = scale ? asString(scale.userBucket) : null;
  if (bucket) facets.push({ label: "Scale", value: prettyEnum(bucket) ?? bucket });

  const realtime = asObject(req.realtime);
  const realtimeRequired = realtime ? asBool(realtime.required) : null;
  if (realtimeRequired !== null) {
    facets.push({ label: "Realtime", value: yesNo(realtimeRequired) });
  }

  const payments = asObject(req.payments);
  const paymentsRequired = payments ? asBool(payments.required) : null;
  if (paymentsRequired !== null) {
    facets.push({ label: "Payments", value: yesNo(paymentsRequired) });
  }

  const mobile = asObject(req.mobile);
  const mobileRequired = mobile ? asBool(mobile.required) : null;
  if (mobileRequired !== null) {
    facets.push({ label: "Mobile", value: yesNo(mobileRequired) });
  }

  const notifications = asObject(req.notifications);
  const channels = notifications ? asStringArray(notifications.channels) : [];
  if (notifications) {
    facets.push({
      label: "Notifications",
      value: channels.length === 0 ? "None" : channels.join(", "),
    });
  }

  const budget = asString(req.budgetLevel);
  if (budget) facets.push({ label: "Budget", value: prettyEnum(budget) ?? budget });

  const cloud = asString(req.preferredCloud);
  if (cloud) facets.push({ label: "Cloud", value: prettyEnum(cloud) ?? cloud });

  const ttm = asString(req.timeToMarket);
  if (ttm) facets.push({ label: "Pace", value: prettyEnum(ttm) ?? ttm });

  return facets;
}

const MAX_LIST_PREVIEW = 4;

function listPreview(items: string[]): { shown: string[]; rest: number } {
  if (items.length <= MAX_LIST_PREVIEW) return { shown: items, rest: 0 };
  return {
    shown: items.slice(0, MAX_LIST_PREVIEW),
    rest: items.length - MAX_LIST_PREVIEW,
  };
}

export default function RequirementsPreview({
  requirements,
  onBackToQuestions,
  onStartOver,
  onGenerateArchitecture,
  isGenerating = false,
}: Props) {
  const req = asObject(requirements);
  const canGenerate = !!onGenerateArchitecture && !!req && !isGenerating;

  if (!req) {
    return (
      <div className="discovery-error-card" role="alert">
        <div className="discovery-flow-eyebrow">
          <span className="discovery-flow-eyebrow-dot" aria-hidden="true" />
          Requirements
        </div>
        <h2 className="discovery-flow-title">
          Requirements payload was empty
        </h2>
        <p className="discovery-flow-sub">
          The backend returned a succeeded job but the requirements result
          was missing. Try again or edit your answers.
        </p>
        <div className="discovery-flow-foot discovery-flow-foot-split">
          <button
            type="button"
            className="wiz-btn wiz-btn-ghost"
            onClick={onStartOver}
          >
            Start over
          </button>
          <button
            type="button"
            className="wiz-btn wiz-btn-dark"
            onClick={onBackToQuestions}
          >
            Back to questions →
          </button>
        </div>
      </div>
    );
  }

  const summary = asString(req.refinedSummary);
  const facets = buildFacets(req);
  const assumptions = asStringArray(req.assumptions);
  const unresolved = asStringArray(req.unresolved);
  const assumptionsView = listPreview(assumptions);
  const unresolvedView = listPreview(unresolved);

  return (
    <div
      className="discovery-quest-shell"
      role="region"
      aria-label="Requirements preview"
    >
      <header className="discovery-quest-header">
        <div className="discovery-flow-eyebrow">
          <span className="discovery-flow-eyebrow-dot" aria-hidden="true" />
          Requirements
        </div>
        <h2 className="discovery-flow-title">Requirements ready</h2>
        {summary ? <p className="discovery-flow-sub">{summary}</p> : null}
      </header>

      {facets.length > 0 ? (
        <div className="requirements-facet-grid" aria-label="Requirement facets">
          {facets.map((f) => (
            <div className="requirements-facet" key={f.label}>
              <span className="requirements-facet-label">{f.label}</span>
              <span className="requirements-facet-value">{f.value}</span>
            </div>
          ))}
        </div>
      ) : null}

      {assumptions.length > 0 ? (
        <section aria-label="Assumptions">
          <div className="requirements-section-head">
            <span className="discovery-cat-chip">Assumptions</span>
            <span className="requirements-section-count">
              {assumptions.length}
            </span>
          </div>
          <ul className="requirements-list">
            {assumptionsView.shown.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
          {assumptionsView.rest > 0 ? (
            <p className="requirements-section-more">
              +{assumptionsView.rest} more
            </p>
          ) : null}
        </section>
      ) : null}

      {unresolved.length > 0 ? (
        <section aria-label="Unresolved">
          <div className="requirements-section-head">
            <span className="discovery-cat-chip">Unresolved</span>
            <span className="requirements-section-count">
              {unresolved.length}
            </span>
          </div>
          <ul className="requirements-list">
            {unresolvedView.shown.map((u, i) => (
              <li key={i}>{u}</li>
            ))}
          </ul>
          {unresolvedView.rest > 0 ? (
            <p className="requirements-section-more">
              +{unresolvedView.rest} more
            </p>
          ) : null}
        </section>
      ) : null}

      <div className="discovery-flow-foot discovery-flow-foot-split">
        <div className="discovery-flow-foot-left">
          <button
            type="button"
            className="wiz-btn wiz-btn-ghost"
            onClick={onStartOver}
          >
            Start over
          </button>
          <button
            type="button"
            className="wiz-btn wiz-btn-ghost"
            onClick={onBackToQuestions}
          >
            ← Back to questions
          </button>
        </div>
        <div className="discovery-final-cluster">
          <span className="discovery-final-note">
            {isGenerating
              ? "Sending requirements to the architecture pipeline."
              : "We'll synthesize a system architecture from these requirements."}
          </span>
          <button
            type="button"
            className="wiz-btn wiz-btn-dark"
            onClick={canGenerate ? onGenerateArchitecture : undefined}
            disabled={!canGenerate}
            aria-disabled={!canGenerate}
            title={
              canGenerate
                ? "Send these requirements to the architecture pipeline."
                : isGenerating
                ? "Architecture generation in progress."
                : "Architecture generation is not available right now."
            }
          >
            {isGenerating ? "Generating…" : "Generate architecture →"}
          </button>
        </div>
      </div>
    </div>
  );
}
