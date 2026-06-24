import {
  architecturePattern,
  architectureSummary,
  asObject,
  asStringArray,
  extractComponents,
  extractTechStack,
  hasAlternativesArtifact,
  hasCostArtifact,
  hasMermaidArtifact,
  prettyEnum,
  type ArchitectureComponent,
} from "../lib/architectureResult";

/**
 * Full architecture board for the workspace. Compared to
 * ArchitecturePreview (the compact post-job card) this view renders
 * every component, every tech-stack group, and every list item — no
 * "+N more" caps. We still treat the result as `unknown` and lean on
 * the safe extraction helpers in lib/architectureResult.ts so missing
 * or differently-shaped fields can never crash the page.
 *
 * What this view intentionally does NOT do (deferred to later steps):
 *   - render Mermaid diagrams
 *   - render the cost deep-dive
 *   - render the alternatives comparison
 *   - persist or fetch anything (no API calls)
 */

type Props = {
  architecture: unknown;
  brief: string | null;
};

export default function ArchitectureBoard({ architecture, brief }: Props) {
  const arch = asObject(architecture);

  if (!arch) {
    return (
      <div className="workspace-board-empty" role="alert">
        <div className="discovery-flow-eyebrow">
          <span className="discovery-flow-eyebrow-dot" aria-hidden="true" />
          Architecture
        </div>
        <h2 className="discovery-flow-title">
          Architecture payload was empty
        </h2>
        <p className="discovery-flow-sub">
          The backend returned a succeeded job but the architecture
          result was missing. Try generating again from Home.
        </p>
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

  const mermaidPresent = hasMermaidArtifact(arch);
  const costPresent = hasCostArtifact(arch);
  const altsPresent = hasAlternativesArtifact(arch);

  const subtitle = summary ?? brief;

  return (
    <div className="workspace-board" aria-label="Architecture board">
      <header className="workspace-board-header">
        <div className="discovery-flow-eyebrow">
          <span className="discovery-flow-eyebrow-dot" aria-hidden="true" />
          Architecture
        </div>
        <h1 className="workspace-board-title">Architecture Workspace</h1>
        {subtitle ? (
          <p className="workspace-board-sub">{subtitle}</p>
        ) : null}
        <div className="workspace-board-chips">
          {pattern ? (
            <span className="discovery-meta-chip">
              <span>Pattern</span>
              <strong>{prettyEnum(pattern) ?? pattern}</strong>
            </span>
          ) : null}
          <span className="discovery-meta-chip">
            <span>Components</span>
            <strong>{components.length}</strong>
          </span>
          {warnings.length > 0 ? (
            <span className="discovery-meta-chip">
              <span>Warnings</span>
              <strong>{warnings.length}</strong>
            </span>
          ) : null}
        </div>
      </header>

      {warnings.length > 0 ? (
        <section
          className="workspace-section arch-warning-card"
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

      {pattern ? (
        <section className="workspace-section" aria-label="Architecture pattern">
          <div className="requirements-section-head">
            <span className="discovery-cat-chip">Pattern</span>
          </div>
          <p className="workspace-pattern-text">
            {prettyEnum(pattern) ?? pattern}
          </p>
        </section>
      ) : null}

      {components.length > 0 ? (
        <section className="workspace-section" aria-label="System components">
          <div className="requirements-section-head">
            <span className="discovery-cat-chip">System components</span>
            <span className="requirements-section-count">
              {components.length}
            </span>
          </div>
          <ul className="workspace-component-grid">
            {components.map((c, i) => (
              <ComponentCard key={`${c.name}-${i}`} component={c} />
            ))}
          </ul>
        </section>
      ) : null}

      {techStack.length > 0 ? (
        <section className="workspace-section" aria-label="Tech stack">
          <div className="requirements-section-head">
            <span className="discovery-cat-chip">Tech stack</span>
          </div>
          <ul className="arch-stack-list">
            {techStack.map((t) => (
              <li key={t.group} className="arch-stack-row">
                <span className="arch-stack-group">
                  {prettyEnum(t.group) ?? t.group}
                </span>
                <span className="arch-stack-entries">
                  {t.entries.join(", ")}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {decisions.length > 0 ? (
        <section className="workspace-section" aria-label="Key decisions">
          <div className="requirements-section-head">
            <span className="discovery-cat-chip">Key decisions</span>
            <span className="requirements-section-count">
              {decisions.length}
            </span>
          </div>
          <ul className="requirements-list">
            {decisions.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {scaling.length > 0 ? (
        <section className="workspace-section" aria-label="Scaling notes">
          <div className="requirements-section-head">
            <span className="discovery-cat-chip">Scaling</span>
            <span className="requirements-section-count">{scaling.length}</span>
          </div>
          <ul className="requirements-list">
            {scaling.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {security.length > 0 ? (
        <section className="workspace-section" aria-label="Security notes">
          <div className="requirements-section-head">
            <span className="discovery-cat-chip">Security</span>
            <span className="requirements-section-count">
              {security.length}
            </span>
          </div>
          <ul className="requirements-list">
            {security.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {openQuestions.length > 0 ? (
        <section className="workspace-section" aria-label="Open questions">
          <div className="requirements-section-head">
            <span className="discovery-cat-chip">Open questions</span>
            <span className="requirements-section-count">
              {openQuestions.length}
            </span>
          </div>
          <ul className="requirements-list">
            {openQuestions.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {mermaidPresent || costPresent || altsPresent ? (
        <section className="workspace-section" aria-label="Workspace artifacts">
          <div className="requirements-section-head">
            <span className="discovery-cat-chip">Workspace artifacts</span>
          </div>
          <ul className="arch-artifact-list">
            {mermaidPresent ? (
              <li className="arch-artifact">
                <span className="arch-artifact-name">System diagram</span>
                <span className="arch-artifact-note">
                  Mermaid source available — full viewer coming next.
                </span>
              </li>
            ) : null}
            {costPresent ? (
              <li className="arch-artifact">
                <span className="arch-artifact-name">Cost estimate</span>
                <span className="arch-artifact-note">
                  Cost breakdown available — cost panel coming next.
                </span>
              </li>
            ) : null}
            {altsPresent ? (
              <li className="arch-artifact">
                <span className="arch-artifact-name">
                  Alternative approaches
                </span>
                <span className="arch-artifact-note">
                  Alternative architectures available — comparison panel
                  coming next.
                </span>
              </li>
            ) : null}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function ComponentCard({ component }: { component: ArchitectureComponent }) {
  return (
    <li className="workspace-component-card">
      <div className="workspace-component-head">
        <span className="workspace-component-name">{component.name}</span>
        {component.category ? (
          <span className="workspace-component-cat">
            {prettyEnum(component.category) ?? component.category}
          </span>
        ) : null}
      </div>
      {component.role ? (
        <p className="workspace-component-role">{component.role}</p>
      ) : null}
      {component.technologies.length > 0 ? (
        <ul className="workspace-component-tech">
          {component.technologies.map((t, i) => (
            <li key={`${t}-${i}`} className="workspace-component-tech-chip">
              {t}
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

