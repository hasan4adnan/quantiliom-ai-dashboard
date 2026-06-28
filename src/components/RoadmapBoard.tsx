import { useMemo } from "react";
import {
  architecturePattern,
  extractComponents,
  normalizeArchitectureResult,
  prettyEnum,
  type NormalizedRoadmap,
  type NormalizedRoadmapPhase,
  type NormalizedRoadmapTask,
} from "../lib/architectureResult";
import {
  generateFallbackRoadmap,
  unwrapRequirements,
} from "../lib/fallbackRoadmap";

/**
 * Workspace Roadmap page (Step 9s).
 *
 * Renders an implementation plan for the generated architecture. Two
 * paths:
 *
 *   1. Structured — `normalizeArchitectureResult` already extracted a
 *      roadmap from any of the supported paths (architecture /
 *      recommendation / alternative / derivedOutputs / wrapper root).
 *      We render its phases verbatim.
 *
 *   2. Fallback — the backend doesn't emit a roadmap today. When the
 *      structured extractor returned null we build a deterministic plan
 *      from the workspace data already in memory: components, tech-stack
 *      items, recommended profile, and the requirements object. No
 *      backend call, no LLM, no persistence — same inputs always
 *      produce the same plan.
 *
 * A small "Generated from architecture output" note appears under the
 * header when the fallback path is used, so the user can tell what
 * they're looking at.
 */

type Props = {
  architecture: unknown;
  requirements: unknown;
};

type RoadmapSource = "structured" | "fallback";

export default function RoadmapBoard({ architecture, requirements }: Props) {
  const normalized = useMemo(
    () => normalizeArchitectureResult(architecture),
    [architecture]
  );
  const components = useMemo(
    () =>
      normalized.architecture
        ? extractComponents(normalized.architecture)
        : [],
    [normalized.architecture]
  );
  const reqObj = useMemo(() => unwrapRequirements(requirements), [requirements]);

  const { roadmap, source } = useMemo<{
    roadmap: NormalizedRoadmap | null;
    source: RoadmapSource;
  }>(() => {
    if (normalized.roadmap && normalized.roadmap.phases.length > 0) {
      return { roadmap: normalized.roadmap, source: "structured" };
    }
    const fallback = generateFallbackRoadmap({
      components,
      techItems: normalized.techStackItems,
      profile: normalized.recommendedProfile,
      requirements: reqObj,
    });
    return { roadmap: fallback, source: "fallback" };
  }, [
    normalized.roadmap,
    normalized.techStackItems,
    normalized.recommendedProfile,
    components,
    reqObj,
  ]);

  const pattern = normalized.architecture
    ? architecturePattern(normalized.architecture)
    : null;
  const profileLabel = normalized.recommendedProfileLabel;

  const chips: { label: string; value: string }[] = [];
  if (profileLabel) chips.push({ label: "Profile", value: profileLabel });
  if (pattern)
    chips.push({ label: "Pattern", value: prettyEnum(pattern) ?? pattern });
  if (roadmap && roadmap.phases.length > 0)
    chips.push({ label: "Phases", value: String(roadmap.phases.length) });
  chips.push({
    label: "Source",
    value: source === "structured" ? "Engine" : "Generated",
  });

  const isEmpty =
    !roadmap ||
    (roadmap.phases.length === 0 && !roadmap.summary);

  return (
    <section className="roadmap-board" aria-label="Roadmap">
      <header className="roadmap-board-header">
        <span className="roadmap-board-eyebrow">Roadmap</span>
        <h1 className="roadmap-board-title">Roadmap</h1>
        <p className="roadmap-board-sub">
          A phased implementation plan for this project.
        </p>
        {chips.length > 0 ? (
          <div className="roadmap-board-chips">
            {chips.map((c) => (
              <span key={c.label} className="architecture-canvas-chip">
                <span>{c.label}</span>
                <strong>{c.value}</strong>
              </span>
            ))}
          </div>
        ) : null}
        {source === "fallback" && !isEmpty ? (
          <p className="roadmap-source-note" role="note">
            Generated from the architecture output. Treat this as a starting
            outline, not a commitment.
          </p>
        ) : null}
      </header>

      {isEmpty ? (
        <div className="roadmap-empty" role="status">
          Roadmap is not available for this run.
        </div>
      ) : (
        <>
          {roadmap.summary ? (
            <section
              className="roadmap-summary-card"
              aria-label="Roadmap summary"
            >
              <p className="roadmap-summary-text">{roadmap.summary}</p>
            </section>
          ) : null}

          {roadmap.phases.length > 0 ? (
            <ol className="roadmap-timeline">
              {roadmap.phases.map((phase, i) => (
                <PhaseCard
                  key={phase.id}
                  phase={phase}
                  index={i}
                  isLast={i === roadmap.phases.length - 1}
                />
              ))}
            </ol>
          ) : null}
        </>
      )}
    </section>
  );
}

function PhaseCard({
  phase,
  index,
  isLast,
}: {
  phase: NormalizedRoadmapPhase;
  index: number;
  isLast: boolean;
}) {
  const className =
    "roadmap-phase" + (isLast ? " roadmap-phase--last" : "");
  return (
    <li className={className}>
      <div className="roadmap-phase-marker" aria-hidden="true">
        <span className="roadmap-phase-number">{index + 1}</span>
      </div>
      <article className="roadmap-phase-card">
        <header className="roadmap-phase-head">
          <h2 className="roadmap-phase-title">{phase.title}</h2>
          {phase.duration ? (
            <span className="roadmap-phase-duration">{phase.duration}</span>
          ) : null}
        </header>
        {phase.summary ? (
          <p className="roadmap-phase-summary">{phase.summary}</p>
        ) : null}
        {phase.tasks.length > 0 ? (
          <ul className="roadmap-task-list" aria-label="Tasks">
            {phase.tasks.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </ul>
        ) : null}
        {phase.outcomes.length > 0 ? (
          <div className="roadmap-outcomes">
            <span className="roadmap-outcomes-label">Outcomes</span>
            <ul className="roadmap-outcome-list">
              {phase.outcomes.map((o, i) => (
                <li key={`o-${i}`}>{o}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </article>
    </li>
  );
}

function TaskRow({ task }: { task: NormalizedRoadmapTask }) {
  return (
    <li className="roadmap-task">
      <span className="roadmap-task-bullet" aria-hidden="true" />
      <div className="roadmap-task-body">
        <span className="roadmap-task-title">{task.title}</span>
        {task.description ? (
          <span className="roadmap-task-desc">{task.description}</span>
        ) : null}
      </div>
      {task.category ? (
        <span className="roadmap-task-cat">
          {prettyEnum(task.category) ?? task.category}
        </span>
      ) : null}
    </li>
  );
}
