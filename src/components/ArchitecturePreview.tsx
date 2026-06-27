import {
  architecturePattern,
  architectureSummary,
  asStringArray,
  extractComponents,
  extractTechStack,
  hasAlternativesArtifact,
  hasCostArtifact,
  hasMermaidArtifact,
  listPreview,
  normalizeArchitectureResult,
  prettyEnum,
} from "../lib/architectureResult";

/**
 * Compact, read-only preview of the architecture decision payload the
 * backend produced from the normalized requirements.
 *
 * Uses the same `normalizeArchitectureResult` helper as the workspace
 * board, so the preview surfaces real component counts / pattern /
 * summary whether the backend returned the direct architecture shape or
 * the decision-wrapper shape (recommendedProfile + recommendation +
 * tradeoffs + alternatives[]).
 *
 * This is intentionally a small preview; the full internal workspace is
 * where the user gets the full board with tradeoffs + alternatives.
 */

type Props = {
  architecture: unknown;
  onBackToRequirements: () => void;
  onStartOver: () => void;
  /**
   * Called when the user clicks "Open architecture workspace". The
   * parent owns workspace state + navigation so this component stays
   * presentational. When omitted, the button stays disabled.
   */
  onOpenWorkspace?: () => void;
};

const MAX_LIST_PREVIEW = 5;

export default function ArchitecturePreview({
  architecture,
  onBackToRequirements,
  onStartOver,
  onOpenWorkspace,
}: Props) {
  const normalized = normalizeArchitectureResult(architecture);
  const arch = normalized.architecture;
  const canOpenWorkspace = !!onOpenWorkspace && !!architecture;

  if (!arch) {
    // The backend ran successfully but we couldn't locate a structured
    // architecture object. Still allow opening the workspace so the user
    // can see the tradeoffs/alternatives we did extract.
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
          <h2 className="discovery-flow-title">
            Architecture decision ready
          </h2>
          <p className="discovery-flow-sub">
            The engine returned a decision and{" "}
            {normalized.alternatives.length} profile alternative
            {normalized.alternatives.length === 1 ? "" : "s"}. Open the
            workspace to review the tradeoffs and details.
          </p>
          {normalized.recommendedProfileLabel ? (
            <div className="discovery-quest-meta">
              <span className="discovery-meta-chip">
                <span>Profile</span>
                <strong>{normalized.recommendedProfileLabel}</strong>
              </span>
              {normalized.alternatives.length > 0 ? (
                <span className="discovery-meta-chip">
                  <span>Alternatives</span>
                  <strong>{normalized.alternatives.length}</strong>
                </span>
              ) : null}
            </div>
          ) : null}
        </header>
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
          <button
            type="button"
            className="wiz-btn wiz-btn-dark"
            onClick={canOpenWorkspace ? onOpenWorkspace : undefined}
            disabled={!canOpenWorkspace}
            aria-disabled={!canOpenWorkspace}
          >
            Open architecture workspace →
          </button>
        </div>
      </div>
    );
  }

  const summary = architectureSummary(arch);
  const pattern = architecturePattern(arch);
  const components = extractComponents(arch);
  const techStack = extractTechStack(arch);
  const decisions = asStringArray(arch.keyDecisions);
  const scaling = asStringArray(arch.scalingNotes);
  const security = asStringArray(arch.securityNotes);
  const openQuestions = asStringArray(arch.openQuestions);
  const warnings = asStringArray(arch.validationWarnings);

  const componentsView = listPreview(components, MAX_LIST_PREVIEW);
  const decisionsView = listPreview(decisions, MAX_LIST_PREVIEW);
  const scalingView = listPreview(scaling, MAX_LIST_PREVIEW);
  const securityView = listPreview(security, MAX_LIST_PREVIEW);
  const openQuestionsView = listPreview(openQuestions, MAX_LIST_PREVIEW);

  const hasMermaid =
    hasMermaidArtifact(arch) ||
    normalized.alternatives.some((a) => a.hasMermaid);
  const hasCost =
    hasCostArtifact(arch) || normalized.alternatives.some((a) => a.hasCost);
  const hasAlternatives =
    hasAlternativesArtifact(arch) || normalized.alternatives.length > 0;

  const recommendedLabel = normalized.recommendedProfileLabel;

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
        {recommendedLabel ||
        pattern ||
        components.length > 0 ||
        normalized.alternatives.length > 0 ? (
          <div className="discovery-quest-meta">
            {recommendedLabel ? (
              <span className="discovery-meta-chip">
                <span>Profile</span>
                <strong>{recommendedLabel}</strong>
              </span>
            ) : null}
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
            {normalized.alternatives.length > 0 ? (
              <span className="discovery-meta-chip">
                <span>Alternatives</span>
                <strong>{normalized.alternatives.length}</strong>
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
                  Diagram source available — interactive viewer opens in the
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
            {canOpenWorkspace
              ? "Open the workspace to explore components, decisions, and trade-offs."
              : "The full workspace view will be connected in the next step."}
          </span>
          <button
            type="button"
            className="wiz-btn wiz-btn-dark"
            onClick={canOpenWorkspace ? onOpenWorkspace : undefined}
            disabled={!canOpenWorkspace}
            aria-disabled={!canOpenWorkspace}
            title={
              canOpenWorkspace
                ? "Open the architecture workspace."
                : "Architecture is not available yet."
            }
          >
            Open architecture workspace →
          </button>
        </div>
      </div>
    </div>
  );
}
