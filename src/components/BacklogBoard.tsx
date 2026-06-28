import { useMemo } from "react";
import {
  architecturePattern,
  extractComponents,
  normalizeArchitectureResult,
  prettyEnum,
  type NormalizedBacklog,
  type NormalizedBacklogItem,
  type NormalizedRoadmap,
} from "../lib/architectureResult";
import {
  generateFallbackRoadmap,
  unwrapRequirements,
} from "../lib/fallbackRoadmap";

/**
 * Workspace Backlog page (Step 9t).
 *
 * Read-only Jira-/Linear-style view of the implementation work for the
 * generated architecture. Two paths:
 *
 *   1. Structured — the engine emitted `backlog | tasks | userStories
 *      | epics | …` somewhere in the result; `normalizeArchitectureResult`
 *      already extracted it. We render the items as-is, grouped by epic
 *      or phase.
 *
 *   2. Fallback — the engine emitted nothing the extractor recognised.
 *      We derive a deterministic backlog from the (structured or
 *      fallback-generated) roadmap. Each roadmap phase becomes an epic;
 *      each roadmap task becomes a backlog item; priority is assigned
 *      by phase position (early phases are must-haves, late phases are
 *      later); the task `category` is mapped to a coarse `type` chip.
 *
 * This view intentionally does NOT:
 *   - call any backend
 *   - persist anything (storage, URL)
 *   - allow editing, drag-and-drop, or completion checkboxes
 *   - export to Jira / Linear / GitHub
 *
 * Those affordances would all imply state the dashboard doesn't own
 * yet, so they're deliberately absent.
 */

type Props = {
  architecture: unknown;
  requirements: unknown;
};

type BacklogSource = "structured" | "fallback";

/**
 * Coarse category → backlog type mapping. Keeps the chip vocabulary
 * predictable across runs, regardless of how granular the upstream
 * category string is. Anything unrecognised falls through to "Feature".
 */
function categoryToType(category: string | null): string {
  if (!category) return "Feature";
  const c = category.toLowerCase();
  if (/(setup|init|bootstrap|config)/.test(c)) return "Setup";
  if (/(security|auth|iam|compliance)/.test(c)) return "Security";
  if (/(integration|payment|notification|realtime|webhook|external)/.test(c))
    return "Integration";
  if (/(qa|test|quality)/.test(c)) return "QA";
  if (/(ops|infra|deploy|observability|monitoring|logging|tracing)/.test(c))
    return "Infrastructure";
  if (/(performance|cost|cache|queue|search|scaling|optimi[sz]ation)/.test(c))
    return "Optimization";
  if (/(data|storage|backup)/.test(c)) return "Infrastructure";
  return "Feature";
}

const PRIORITY_ORDER: Record<string, number> = {
  "must-have": 0,
  must: 0,
  high: 0,
  p0: 0,
  "should-have": 1,
  should: 1,
  medium: 1,
  p1: 1,
  later: 2,
  nice: 2,
  low: 2,
  p2: 2,
};

function normalizePriorityKey(p: string | null): string | null {
  if (!p) return null;
  return p.toLowerCase().replace(/[\s_]/g, "-");
}

function priorityRank(p: string | null): number {
  const key = normalizePriorityKey(p);
  if (!key) return 3;
  return PRIORITY_ORDER[key] ?? 3;
}

/**
 * Map a roadmap phase index to a coarse priority. Early phases are
 * must-haves; the very last phase is "Later"; the middle is
 * "Should-have". When there are fewer than three phases we collapse to
 * "Must-have" / "Should-have" so the chips still mean something.
 */
function phaseIndexToPriority(index: number, total: number): string {
  if (total <= 1) return "Must-have";
  if (index <= 1) return "Must-have";
  if (index === total - 1 && total >= 4) return "Later";
  return "Should-have";
}

function roadmapToBacklog(roadmap: NormalizedRoadmap): NormalizedBacklog | null {
  if (roadmap.phases.length === 0) return null;
  const items: NormalizedBacklogItem[] = [];
  for (let pi = 0; pi < roadmap.phases.length; pi++) {
    const phase = roadmap.phases[pi]!;
    const priority = phaseIndexToPriority(pi, roadmap.phases.length);
    for (let ti = 0; ti < phase.tasks.length; ti++) {
      const t = phase.tasks[ti]!;
      items.push({
        id: `${phase.id}-item-${ti + 1}`,
        title: t.title,
        description: t.description,
        epic: phase.title,
        phase: phase.title,
        type: categoryToType(t.category),
        priority,
        category: t.category,
        acceptanceCriteria: [],
      });
    }
  }
  if (items.length === 0) return null;
  return { items, summary: roadmap.summary };
}

type BacklogGroup = {
  name: string;
  items: NormalizedBacklogItem[];
};

function groupItems(items: NormalizedBacklogItem[]): BacklogGroup[] {
  const groups: BacklogGroup[] = [];
  const indexByName = new Map<string, number>();
  for (const item of items) {
    const name = item.epic ?? item.phase ?? "Other";
    const idx = indexByName.get(name);
    if (idx === undefined) {
      indexByName.set(name, groups.length);
      groups.push({ name, items: [item] });
    } else {
      const existing = groups[idx];
      if (existing) existing.items.push(item);
    }
  }
  return groups;
}

export default function BacklogBoard({ architecture, requirements }: Props) {
  const normalized = useMemo(
    () => normalizeArchitectureResult(architecture),
    [architecture]
  );
  const components = useMemo(
    () =>
      normalized.architecture ? extractComponents(normalized.architecture) : [],
    [normalized.architecture]
  );
  const reqObj = useMemo(
    () => unwrapRequirements(requirements),
    [requirements]
  );

  const { backlog, source } = useMemo<{
    backlog: NormalizedBacklog | null;
    source: BacklogSource;
  }>(() => {
    if (normalized.backlog && normalized.backlog.items.length > 0) {
      return { backlog: normalized.backlog, source: "structured" };
    }
    // Prefer the engine-emitted roadmap when present; otherwise derive
    // one with the same deterministic generator the Roadmap board uses.
    // Either way we then collapse phases → epics and tasks → items, so
    // the user sees a single consistent backlog regardless of source.
    const roadmap =
      normalized.roadmap && normalized.roadmap.phases.length > 0
        ? normalized.roadmap
        : generateFallbackRoadmap({
            components,
            techItems: normalized.techStackItems,
            profile: normalized.recommendedProfile,
            requirements: reqObj,
          });
    if (!roadmap) return { backlog: null, source: "fallback" };
    return { backlog: roadmapToBacklog(roadmap), source: "fallback" };
  }, [
    normalized.backlog,
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

  const groups = useMemo(
    () => (backlog ? groupItems(backlog.items) : []),
    [backlog]
  );

  // Priority counts for the small stats strip. Skip the strip when no
  // item carries a recognisable priority — empty bars are noisier than
  // helpful.
  const priorityCounts = useMemo(() => {
    if (!backlog) return null;
    let must = 0;
    let should = 0;
    let later = 0;
    let other = 0;
    for (const item of backlog.items) {
      const rank = priorityRank(item.priority);
      if (rank === 0) must += 1;
      else if (rank === 1) should += 1;
      else if (rank === 2) later += 1;
      else other += 1;
    }
    if (must + should + later === 0) return null;
    return { must, should, later, other, total: backlog.items.length };
  }, [backlog]);

  const chips: { label: string; value: string }[] = [];
  if (profileLabel) chips.push({ label: "Profile", value: profileLabel });
  if (pattern)
    chips.push({ label: "Pattern", value: prettyEnum(pattern) ?? pattern });
  if (backlog && backlog.items.length > 0)
    chips.push({ label: "Items", value: String(backlog.items.length) });
  chips.push({
    label: "Source",
    value: source === "structured" ? "Engine" : "Generated",
  });

  const isEmpty =
    !backlog || (backlog.items.length === 0 && !backlog.summary);

  return (
    <section className="backlog-board" aria-label="Backlog">
      <header className="backlog-board-header">
        <span className="backlog-board-eyebrow">Backlog</span>
        <h1 className="backlog-board-title">Backlog</h1>
        <p className="backlog-board-sub">
          Actionable implementation work items for this project.
        </p>
        {chips.length > 0 ? (
          <div className="backlog-board-chips">
            {chips.map((c) => (
              <span key={c.label} className="architecture-canvas-chip">
                <span>{c.label}</span>
                <strong>{c.value}</strong>
              </span>
            ))}
          </div>
        ) : null}
        {!isEmpty ? (
          <p className="backlog-source-note" role="note">
            {source === "structured"
              ? "Extracted from the architecture output."
              : "Generated from roadmap and architecture output."}
          </p>
        ) : null}
      </header>

      {isEmpty ? (
        <div className="backlog-empty" role="status">
          Backlog is not available for this run.
        </div>
      ) : (
        <>
          {backlog.summary ? (
            <section
              className="backlog-summary-card"
              aria-label="Backlog summary"
            >
              <p className="backlog-summary-text">{backlog.summary}</p>
            </section>
          ) : null}

          {priorityCounts ? (
            <section className="backlog-stats" aria-label="Backlog stats">
              <span className="backlog-stat">
                <span className="backlog-stat-label">Total</span>
                <span className="backlog-stat-value">
                  {priorityCounts.total}
                </span>
              </span>
              <span className="backlog-stat backlog-stat--must">
                <span className="backlog-stat-label">Must-have</span>
                <span className="backlog-stat-value">{priorityCounts.must}</span>
              </span>
              <span className="backlog-stat backlog-stat--should">
                <span className="backlog-stat-label">Should-have</span>
                <span className="backlog-stat-value">
                  {priorityCounts.should}
                </span>
              </span>
              <span className="backlog-stat backlog-stat--later">
                <span className="backlog-stat-label">Later</span>
                <span className="backlog-stat-value">{priorityCounts.later}</span>
              </span>
            </section>
          ) : null}

          {groups.length > 0 ? (
            <div className="backlog-groups">
              {groups.map((g) => (
                <BacklogGroupCard key={g.name} group={g} />
              ))}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

function BacklogGroupCard({ group }: { group: BacklogGroup }) {
  return (
    <section className="backlog-group" aria-label={group.name}>
      <div className="backlog-group-head">
        <span className="backlog-group-name">{group.name}</span>
        <span className="backlog-group-count">{group.items.length}</span>
      </div>
      <ul className="backlog-item-list">
        {group.items.map((item) => (
          <BacklogItemCard key={item.id} item={item} />
        ))}
      </ul>
    </section>
  );
}

function BacklogItemCard({ item }: { item: NormalizedBacklogItem }) {
  const priorityKey = normalizePriorityKey(item.priority);
  const priorityClass = priorityKey
    ? ` backlog-priority-chip--${priorityRank(item.priority)}`
    : "";
  return (
    <li className="backlog-item">
      <div className="backlog-item-head">
        <span className="backlog-item-title">{item.title}</span>
        <div className="backlog-item-chips">
          {item.type ? (
            <span
              className={`backlog-type-chip backlog-type-chip--${item.type.toLowerCase()}`}
            >
              {item.type}
            </span>
          ) : null}
          {item.priority ? (
            <span className={`backlog-priority-chip${priorityClass}`}>
              {item.priority}
            </span>
          ) : null}
        </div>
      </div>
      {item.description ? (
        <p className="backlog-item-desc">{item.description}</p>
      ) : null}
      {item.category && categoryShouldRender(item) ? (
        <span className="backlog-item-cat">
          {prettyEnum(item.category) ?? item.category}
        </span>
      ) : null}
      {item.acceptanceCriteria.length > 0 ? (
        <div className="backlog-ac">
          <span className="backlog-ac-label">Acceptance criteria</span>
          <ul className="backlog-ac-list">
            {item.acceptanceCriteria.map((ac, i) => (
              <li key={`ac-${i}`}>{ac}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </li>
  );
}

/**
 * Don't render the category chip when its prettified form is the same
 * as the type chip we already showed — saves visual noise on the
 * common fallback-roadmap path where category and type overlap.
 */
function categoryShouldRender(item: NormalizedBacklogItem): boolean {
  if (!item.category || !item.type) return Boolean(item.category);
  const a = (prettyEnum(item.category) ?? item.category).toLowerCase();
  const b = item.type.toLowerCase();
  return a !== b;
}
