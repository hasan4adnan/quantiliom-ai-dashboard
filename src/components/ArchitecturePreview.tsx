/**
 * Compact, read-only preview of the architecture decision payload the
 * backend produced from the normalized requirements.
 *
 * The shape of the architecture result lives in the backend engine and
 * may evolve. We treat it as `unknown` here and use safe type guards
 * before reading any field — the dashboard should never crash if a
 * field shows up as a different shape than expected. This is intentionally
 * a small preview; the full internal workspace is the next step.
 */

type Props = {
  architecture: unknown;
  onBackToRequirements: () => void;
  onStartOver: () => void;
};

function asObject(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  return v as Record<string, unknown>;
}

function asString(v: unknown): string | null {
  return typeof v === "string" && v.trim().length > 0 ? v : null;
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string" && x.length > 0);
}

function asObjectArray(v: unknown): Record<string, unknown>[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => asObject(x))
    .filter((x): x is Record<string, unknown> => x !== null);
}

function prettyEnum(v: string | null): string | null {
  if (!v) return null;
  return v
    .split("_")
    .map((p) => (p.length === 0 ? p : p[0]!.toUpperCase() + p.slice(1)))
    .join(" ");
}

const MAX_LIST_PREVIEW = 5;

function listPreview<T>(items: T[]): { shown: T[]; rest: number } {
  if (items.length <= MAX_LIST_PREVIEW) return { shown: items, rest: 0 };
  return {
    shown: items.slice(0, MAX_LIST_PREVIEW),
    rest: items.length - MAX_LIST_PREVIEW,
  };
}

type Component = { name: string; role: string | null };

function extractComponents(req: Record<string, unknown>): Component[] {
  const raw = asObjectArray(req.components);
  return raw
    .map((c) => {
      const name = asString(c.name) ?? asString(c.title);
      if (!name) return null;
      const role =
        asString(c.role) ??
        asString(c.purpose) ??
        asString(c.description) ??
        null;
      return { name, role };
    })
    .filter((c): c is Component => c !== null);
}

type TechItem = { group: string; entries: string[] };

function extractTechStack(req: Record<string, unknown>): TechItem[] {
  const stack = req.techStack;

  // Object form: { frontend: ["react"], backend: ["node"], … }
  const obj = asObject(stack);
  if (obj) {
    const out: TechItem[] = [];
    for (const [group, value] of Object.entries(obj)) {
      const entries = asStringArray(value);
      if (entries.length === 0) {
        const single = asString(value);
        if (single) out.push({ group, entries: [single] });
      } else {
        out.push({ group, entries });
      }
    }
    return out;
  }

  // Array of strings.
  const flat = asStringArray(stack);
  if (flat.length > 0) {
    return [{ group: "Stack", entries: flat }];
  }

  // Array of { group, entries } / { name, category }.
  const arr = asObjectArray(stack);
  if (arr.length > 0) {
    return arr
      .map((row) => {
        const group =
          asString(row.group) ??
          asString(row.category) ??
          asString(row.layer) ??
          asString(row.name) ??
          null;
        const entries =
          asStringArray(row.entries).length > 0
            ? asStringArray(row.entries)
            : asStringArray(row.items);
        if (!group) return null;
        if (entries.length === 0) {
          const single = asString(row.value) ?? asString(row.choice);
          if (!single) return null;
          return { group, entries: [single] };
        }
        return { group, entries };
      })
      .filter((t): t is TechItem => t !== null);
  }

  return [];
}

export default function ArchitecturePreview({
  architecture,
  onBackToRequirements,
  onStartOver,
}: Props) {
  const arch = asObject(architecture);

  if (!arch) {
    return (
      <div className="discovery-error-card" role="alert">
        <div className="discovery-flow-eyebrow">
          <span className="discovery-flow-eyebrow-dot" aria-hidden="true" />
          Architecture
        </div>
        <h2 className="discovery-flow-title">
          Architecture payload was empty
        </h2>
        <p className="discovery-flow-sub">
          The backend returned a succeeded job but the architecture result
          was missing. Go back to requirements and try again.
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
            onClick={onBackToRequirements}
          >
            ← Back to requirements
          </button>
        </div>
      </div>
    );
  }

  const summary =
    asString(arch.summary) ??
    asString(arch.overview) ??
    asString(arch.description);
  const pattern =
    asString(arch.patternUsed) ??
    asString(arch.pattern) ??
    asString(arch.architecturePattern);

  const components = extractComponents(arch);
  const techStack = extractTechStack(arch);
  const decisions = asStringArray(arch.keyDecisions);
  const scaling = asStringArray(arch.scalingNotes);
  const security = asStringArray(arch.securityNotes);
  const openQuestions = asStringArray(arch.openQuestions);
  const warnings = asStringArray(arch.validationWarnings);

  const componentsView = listPreview(components);
  const decisionsView = listPreview(decisions);
  const scalingView = listPreview(scaling);
  const securityView = listPreview(security);
  const openQuestionsView = listPreview(openQuestions);

  const hasMermaid = asString(arch.mermaid) !== null;
  const hasCost =
    asObject(arch.cost) !== null || asString(arch.costEstimate) !== null;
  const hasAlternatives = asObjectArray(arch.alternatives).length > 0;

  return (
    <div
      className="discovery-quest-shell"
      role="region"
      aria-label="Architecture preview"
    >
      <header className="discovery-quest-header">
        <div className="discovery-flow-eyebrow">
          <span className="discovery-flow-eyebrow-dot" aria-hidden="true" />
          Architecture
        </div>
        <h2 className="discovery-flow-title">Architecture ready</h2>
        {summary ? <p className="discovery-flow-sub">{summary}</p> : null}
        {pattern || components.length > 0 ? (
          <div className="discovery-quest-meta">
            {pattern ? (
              <span className="discovery-meta-chip">
                <span>Pattern</span>
                <strong>{prettyEnum(pattern) ?? pattern}</strong>
              </span>
            ) : null}
            {components.length > 0 ? (
              <span className="discovery-meta-chip">
                <span>Components</span>
                <strong>{components.length}</strong>
              </span>
            ) : null}
          </div>
        ) : null}
      </header>

      {warnings.length > 0 ? (
        <section
          className="arch-warning-card"
          role="alert"
          aria-label="Validation warnings"
        >
          <span className="discovery-cat-chip">Warnings</span>
          <ul className="requirements-list">
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {components.length > 0 ? (
        <section aria-label="Core components">
          <div className="requirements-section-head">
            <span className="discovery-cat-chip">Core components</span>
            <span className="requirements-section-count">
              {components.length}
            </span>
          </div>
          <ul className="arch-component-list">
            {componentsView.shown.map((c, i) => (
              <li key={`${c.name}-${i}`} className="arch-component">
                <span className="arch-component-name">{c.name}</span>
                {c.role ? (
                  <span className="arch-component-role">{c.role}</span>
                ) : null}
              </li>
            ))}
          </ul>
          {componentsView.rest > 0 ? (
            <p className="requirements-section-more">
              +{componentsView.rest} more
            </p>
          ) : null}
        </section>
      ) : null}

      {techStack.length > 0 ? (
        <section aria-label="Tech stack">
          <div className="requirements-section-head">
            <span className="discovery-cat-chip">Tech stack</span>
          </div>
          <ul className="arch-stack-list">
            {techStack.map((t) => (
              <li key={t.group} className="arch-stack-row">
                <span className="arch-stack-group">
                  {prettyEnum(t.group) ?? t.group}
                </span>
                <span className="arch-stack-entries">{t.entries.join(", ")}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {decisions.length > 0 ? (
        <section aria-label="Key decisions">
          <div className="requirements-section-head">
            <span className="discovery-cat-chip">Key decisions</span>
            <span className="requirements-section-count">
              {decisions.length}
            </span>
          </div>
          <ul className="requirements-list">
            {decisionsView.shown.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
          {decisionsView.rest > 0 ? (
            <p className="requirements-section-more">
              +{decisionsView.rest} more
            </p>
          ) : null}
        </section>
      ) : null}

      {scaling.length > 0 ? (
        <section aria-label="Scaling notes">
          <div className="requirements-section-head">
            <span className="discovery-cat-chip">Scaling</span>
            <span className="requirements-section-count">{scaling.length}</span>
          </div>
          <ul className="requirements-list">
            {scalingView.shown.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
          {scalingView.rest > 0 ? (
            <p className="requirements-section-more">
              +{scalingView.rest} more
            </p>
          ) : null}
        </section>
      ) : null}

      {security.length > 0 ? (
        <section aria-label="Security notes">
          <div className="requirements-section-head">
            <span className="discovery-cat-chip">Security</span>
            <span className="requirements-section-count">{security.length}</span>
          </div>
          <ul className="requirements-list">
            {securityView.shown.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
          {securityView.rest > 0 ? (
            <p className="requirements-section-more">
              +{securityView.rest} more
            </p>
          ) : null}
        </section>
      ) : null}

      {openQuestions.length > 0 ? (
        <section aria-label="Open questions">
          <div className="requirements-section-head">
            <span className="discovery-cat-chip">Open questions</span>
            <span className="requirements-section-count">
              {openQuestions.length}
            </span>
          </div>
          <ul className="requirements-list">
            {openQuestionsView.shown.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
          {openQuestionsView.rest > 0 ? (
            <p className="requirements-section-more">
              +{openQuestionsView.rest} more
            </p>
          ) : null}
        </section>
      ) : null}

      {hasMermaid || hasCost || hasAlternatives ? (
        <section aria-label="Additional artifacts">
          <div className="requirements-section-head">
            <span className="discovery-cat-chip">Workspace artifacts</span>
          </div>
          <ul className="arch-artifact-list">
            {hasMermaid ? (
              <li className="arch-artifact">
                <span className="arch-artifact-name">System diagram</span>
                <span className="arch-artifact-note">
                  Mermaid source available — interactive viewer opens in the
                  workspace.
                </span>
              </li>
            ) : null}
            {hasCost ? (
              <li className="arch-artifact">
                <span className="arch-artifact-name">Cost estimate</span>
                <span className="arch-artifact-note">
                  Cost breakdown available — full deep-dive opens in the
                  workspace.
                </span>
              </li>
            ) : null}
            {hasAlternatives ? (
              <li className="arch-artifact">
                <span className="arch-artifact-name">Alternative approaches</span>
                <span className="arch-artifact-note">
                  Alternative architectures available — trade-off review opens
                  in the workspace.
                </span>
              </li>
            ) : null}
          </ul>
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
            onClick={onBackToRequirements}
          >
            ← Back to requirements
          </button>
        </div>
        <div className="discovery-final-cluster">
          <span className="discovery-final-note">
            The full workspace view will be connected in the next step.
          </span>
          <button
            type="button"
            className="wiz-btn wiz-btn-dark"
            disabled
            aria-disabled="true"
            title="Coming next: open the architecture workspace with diagram, cost, and alternatives."
          >
            Open architecture workspace →
          </button>
        </div>
      </div>
    </div>
  );
}
