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
 * Workspace Backlog page (Step 9u — Jira-like dark panel).
 *
 * Visual direction matches the website's Backlog Intelligence mockup:
 * a dark product-panel window inside the light workspace, with a
 * compact topbar (window dots + title + static tabs), a stats line
 * with an "AI Generated" badge, and grouped epic sections holding
 * compact task rows.
 *
 * Read-only. No drag-and-drop, no checkboxes, no edit / export. Item
 * IDs (`E-01`, `QAI-T001`) are presentational only — they aren't
 * stored anywhere and they don't round-trip back to the backend.
 *
 * Data flow is unchanged from the previous card-grid version:
 *
 *   1. Structured — `normalizeArchitectureResult` already extracted a
 *      backlog from any of the supported paths. Render it grouped by
 *      epic / phase.
 *   2. Fallback — derive a deterministic backlog from the
 *      (structured or fallback-generated) roadmap.
 */

type Props = {
  architecture: unknown;
  requirements: unknown;
};

type BacklogSource = "structured" | "fallback";

/* ════════════════════════════════════════════════════════════════════════
 * Presentational helpers — IDs, priority codes, points, types
 *
 * Deterministic functions of the input data so the page renders the
 * same numbers across re-renders. None of these IDs/points round-trip
 * back to the backend — they exist purely to make the read-only
 * backlog look like a real Jira board.
 * ════════════════════════════════════════════════════════════════════════ */

function generateEpicId(index: number): string {
  return `E-${String(index + 1).padStart(2, "0")}`;
}

function generateTaskId(index: number): string {
  return `QAI-T${String(index + 1).padStart(3, "0")}`;
}

type PriorityCode = "p0" | "p1" | "p2";

function priorityCode(priority: string | null): PriorityCode {
  if (!priority) return "p2";
  const key = priority.toLowerCase().replace(/[\s_]/g, "-");
  if (
    key.startsWith("must") ||
    key === "high" ||
    key === "p0" ||
    key === "critical" ||
    key === "blocker"
  )
    return "p0";
  if (
    key.startsWith("should") ||
    key === "medium" ||
    key === "p1" ||
    key === "major"
  )
    return "p1";
  return "p2";
}

function priorityLabel(code: PriorityCode): string {
  return code.toUpperCase();
}

/**
 * Coarse category → backlog type chip. Mirrors the previous version's
 * mapping so the same input produces the same chips.
 */
function typeLabel(category: string | null, fallbackType: string | null): string {
  const source = `${category ?? ""} ${fallbackType ?? ""}`.toLowerCase();
  if (!source.trim()) return "Feature";
  if (/(setup|init|bootstrap|config)/.test(source)) return "Setup";
  if (/(security|auth|iam|compliance)/.test(source)) return "Security";
  if (/(integration|payment|notification|realtime|webhook|external)/.test(source))
    return "Integration";
  if (/(qa|test|quality)/.test(source)) return "QA";
  if (/(ops|infra|deploy|observability|monitoring|logging|tracing)/.test(source))
    return "Infra";
  if (/(performance|cost|cache|queue|search|scaling|optimi[sz]ation)/.test(source))
    return "Optimization";
  if (/(data|storage|backup)/.test(source)) return "Infra";
  return "Feature";
}

/**
 * Deterministic story-point estimate. 1, 2, 3, or 5 — kept on the
 * Fibonacci-ish scale that real teams use, never higher so we don't
 * imply false precision. Complex types (Integration / Security /
 * Infra) get a bump.
 */
function estimatePoints(item: NormalizedBacklogItem): number {
  const code = priorityCode(item.priority);
  const t = typeLabel(item.category, item.type);
  const complex = t === "Integration" || t === "Security" || t === "Infra";
  if (code === "p0") return complex ? 5 : 3;
  if (code === "p1") return complex ? 3 : 2;
  return complex ? 2 : 1;
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

function roadmapToBacklog(roadmap: NormalizedRoadmap): NormalizedBacklog | null {
  if (roadmap.phases.length === 0) return null;
  const items: NormalizedBacklogItem[] = [];
  for (let pi = 0; pi < roadmap.phases.length; pi++) {
    const phase = roadmap.phases[pi]!;
    const priority =
      pi <= 1
        ? "Must-have"
        : pi === roadmap.phases.length - 1 && roadmap.phases.length >= 4
          ? "Later"
          : "Should-have";
    for (let ti = 0; ti < phase.tasks.length; ti++) {
      const t = phase.tasks[ti]!;
      items.push({
        id: `${phase.id}-item-${ti + 1}`,
        title: t.title,
        description: t.description,
        epic: phase.title,
        phase: phase.title,
        type: typeLabel(t.category, null),
        priority,
        category: t.category,
        acceptanceCriteria: [],
      });
    }
  }
  if (items.length === 0) return null;
  return { items, summary: roadmap.summary };
}

/* ════════════════════════════════════════════════════════════════════════
 * Component
 * ════════════════════════════════════════════════════════════════════════ */

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

  const groups = useMemo(
    () => (backlog ? groupItems(backlog.items) : []),
    [backlog]
  );

  // Pre-compute per-item points + an item→running-id map so task IDs
  // are stable + sequential across the whole backlog (QAI-T001…) and
  // each epic's point total is just the sum of its items' points.
  const pointsByItemId = useMemo(() => {
    const m = new Map<string, number>();
    if (!backlog) return m;
    for (const it of backlog.items) m.set(it.id, estimatePoints(it));
    return m;
  }, [backlog]);

  const taskIdByItemId = useMemo(() => {
    const m = new Map<string, string>();
    if (!backlog) return m;
    let i = 0;
    for (const g of groups) {
      for (const it of g.items) {
        m.set(it.id, generateTaskId(i));
        i += 1;
      }
    }
    return m;
  }, [backlog, groups]);

  const totals = useMemo(() => {
    if (!backlog) return { epics: 0, tasks: 0, points: 0, sprints: 0 };
    let points = 0;
    for (const p of pointsByItemId.values()) points += p;
    const sprints = points > 0 ? Math.max(1, Math.ceil(points / 30)) : 0;
    return {
      epics: groups.length,
      tasks: backlog.items.length,
      points,
      sprints,
    };
  }, [backlog, groups, pointsByItemId]);

  const pattern = normalized.architecture
    ? architecturePattern(normalized.architecture)
    : null;
  const profileLabel = normalized.recommendedProfileLabel;

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
          AI-generated implementation backlog for this project.
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
      </header>

      {isEmpty ? (
        <div className="backlog-empty" role="status">
          Backlog is not available for this run.
        </div>
      ) : (
        <div className="backlog-shell">
          <div className="backlog-window">
            <div className="backlog-window-topbar">
              <div
                className="backlog-window-dots"
                aria-hidden="true"
                title="Window controls (decorative)"
              >
                <span className="backlog-window-dot backlog-window-dot--r" />
                <span className="backlog-window-dot backlog-window-dot--y" />
                <span className="backlog-window-dot backlog-window-dot--g" />
              </div>
              <span className="backlog-window-title">Project Backlog</span>
              <div
                className="backlog-window-tabs"
                role="tablist"
                aria-label="Backlog views"
              >
                <span
                  className="backlog-tab backlog-tab--active"
                  role="tab"
                  aria-selected="true"
                  aria-disabled="true"
                >
                  Backlog
                </span>
                <span
                  className="backlog-tab"
                  role="tab"
                  aria-selected="false"
                  aria-disabled="true"
                  title="Coming next"
                >
                  Sprints
                </span>
                <span
                  className="backlog-tab"
                  role="tab"
                  aria-selected="false"
                  aria-disabled="true"
                  title="Coming next"
                >
                  Board
                </span>
              </div>
            </div>

            <div className="backlog-stats-line">
              <span className="backlog-stat-cell">
                <span className="backlog-stat-cell-value">{totals.epics}</span>
                <span className="backlog-stat-cell-label">Epics</span>
              </span>
              <span className="backlog-stat-cell">
                <span className="backlog-stat-cell-value">{totals.tasks}</span>
                <span className="backlog-stat-cell-label">Tasks</span>
              </span>
              <span className="backlog-stat-cell">
                <span className="backlog-stat-cell-value">{totals.points}</span>
                <span className="backlog-stat-cell-label">Story pts</span>
              </span>
              {totals.sprints > 0 ? (
                <span className="backlog-stat-cell">
                  <span className="backlog-stat-cell-value">
                    {totals.sprints}
                  </span>
                  <span className="backlog-stat-cell-label">Sprints</span>
                </span>
              ) : null}
              <span
                className="backlog-ai-badge"
                title={
                  source === "structured"
                    ? "Extracted from the architecture output"
                    : "Generated from roadmap and architecture output"
                }
              >
                <span
                  className="backlog-ai-badge-dot"
                  aria-hidden="true"
                />
                AI Generated
              </span>
            </div>

            <div className="backlog-window-body" role="region" aria-label="Backlog body">
              {groups.map((group, gi) => (
                <EpicSection
                  key={group.name}
                  group={group}
                  epicId={generateEpicId(gi)}
                  taskIdByItemId={taskIdByItemId}
                  pointsByItemId={pointsByItemId}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function EpicSection({
  group,
  epicId,
  taskIdByItemId,
  pointsByItemId,
}: {
  group: BacklogGroup;
  epicId: string;
  taskIdByItemId: Map<string, string>;
  pointsByItemId: Map<string, number>;
}) {
  const epicPoints = group.items.reduce(
    (sum, it) => sum + (pointsByItemId.get(it.id) ?? 0),
    0
  );
  return (
    <section className="backlog-epic" aria-label={group.name}>
      <header className="backlog-epic-head">
        <span className="backlog-epic-chevron" aria-hidden="true">
          ▸
        </span>
        <span className="backlog-epic-id">{epicId}</span>
        <span className="backlog-epic-title">{group.name}</span>
        <div className="backlog-epic-meta">
          <span className="backlog-epic-count" title="Task count">
            {group.items.length} tasks
          </span>
          <span className="backlog-epic-points" title="Story points">
            {epicPoints} pts
          </span>
        </div>
      </header>
      <ul className="backlog-task-rows">
        {group.items.map((item) => (
          <TaskRow
            key={item.id}
            item={item}
            taskId={taskIdByItemId.get(item.id) ?? "QAI-T???"}
            points={pointsByItemId.get(item.id) ?? 0}
          />
        ))}
      </ul>
    </section>
  );
}

function TaskRow({
  item,
  taskId,
  points,
}: {
  item: NormalizedBacklogItem;
  taskId: string;
  points: number;
}) {
  const pCode = priorityCode(item.priority);
  const tLabel = typeLabel(item.category, item.type);
  const acCount = item.acceptanceCriteria.length;
  // Tooltip surfaces the description without consuming a row — keeps
  // the table compact while still letting power users see the detail.
  const tooltip = item.description ?? undefined;
  return (
    <li className="backlog-task-row" title={tooltip}>
      <span className="backlog-task-id">{taskId}</span>
      <span className="backlog-task-title">{item.title}</span>
      <span className={`backlog-task-priority backlog-priority-${pCode}`}>
        {priorityLabel(pCode)}
      </span>
      <span className="backlog-task-type">{tLabel}</span>
      <span className="backlog-task-status backlog-status">TODO</span>
      {acCount > 0 ? (
        <span className="backlog-task-ac" title={`${acCount} acceptance criteria`}>
          AC {acCount}
        </span>
      ) : null}
      <span className="backlog-task-points backlog-points">{points} pts</span>
    </li>
  );
}
