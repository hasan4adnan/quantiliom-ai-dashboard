/**
 * Safe extraction helpers for the architecture-result payload returned by
 * GET /api/jobs/:id. The shape lives in the backend engine and may
 * evolve, so we always treat the value as `unknown` here and rely on
 * narrow type guards before reading any field. The dashboard must never
 * crash if a field shows up in a different shape than expected.
 *
 * Two distinct shapes are supported because the backend has migrated:
 *
 *   1. Direct architecture shape:
 *      { summary, patternUsed, components, techStack, keyDecisions,
 *        scalingNotes, securityNotes, openQuestions, validationWarnings,
 *        mermaid, cost, alternatives }
 *
 *   2. Decision/alternatives wrapper (current production shape):
 *      { recommendedProfile, recommendation, tradeoffs,
 *        alternatives: [{ profile, architecture, costEstimate, mermaid }] }
 *      where the recommended alternative's `architecture` carries the
 *      shape from (1) and `mermaid` / `costEstimate` are derived outputs.
 *
 * `normalizeArchitectureResult` returns a unified view so the rendering
 * layer doesn't need to branch.
 *
 * Shared by:
 *   - src/components/ArchitecturePreview.tsx (compact post-job preview)
 *   - src/components/ArchitectureBoard.tsx   (full workspace board)
 *
 * Keep this file pure: no React, no globals, no side effects.
 */

export function asObject(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  return v as Record<string, unknown>;
}

export function asString(v: unknown): string | null {
  return typeof v === "string" && v.trim().length > 0 ? v : null;
}

export function asBool(v: unknown): boolean | null {
  return typeof v === "boolean" ? v : null;
}

export function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string" && x.length > 0);
}

export function asObjectArray(v: unknown): Record<string, unknown>[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => asObject(x))
    .filter((x): x is Record<string, unknown> => x !== null);
}

export function prettyEnum(v: string | null): string | null {
  if (!v) return null;
  return v
    .split("_")
    .map((p) => (p.length === 0 ? p : p[0]!.toUpperCase() + p.slice(1)))
    .join(" ");
}

export function yesNo(v: boolean | null): string {
  if (v === null) return "—";
  return v ? "Yes" : "No";
}

export type ArchitectureComponent = {
  /**
   * Stable diagram id — comes from the raw component when the engine
   * provides one, otherwise a deterministic slug from name/category.
   * Edges may reference components by id, by name, or by either, so the
   * diagram resolver matches both forms.
   */
  id: string;
  name: string;
  role: string | null;
  category: string | null;
  technologies: string[];
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function extractComponents(
  arch: Record<string, unknown>
): ArchitectureComponent[] {
  const raw = asObjectArray(arch.components);
  const seenIds = new Set<string>();
  return raw
    .map((c) => {
      const name = asString(c.name) ?? asString(c.title);
      if (!name) return null;
      const role =
        asString(c.role) ??
        asString(c.purpose) ??
        asString(c.responsibility) ??
        asString(c.description) ??
        null;
      const category =
        asString(c.category) ??
        asString(c.type) ??
        asString(c.layer) ??
        asString(c.kind) ??
        null;
      const techCandidates = [
        c.technologies,
        c.tech,
        c.stack,
        c.tools,
      ];
      let technologies: string[] = [];
      for (const cand of techCandidates) {
        const arr = asStringArray(cand);
        if (arr.length > 0) {
          technologies = arr;
          break;
        }
        const single = asString(cand);
        if (single) {
          technologies = [single];
          break;
        }
      }
      let id =
        asString(c.id) ??
        asString(c.key) ??
        asString(c.slug) ??
        slugify(`${name}${category ? `-${category}` : ""}`);
      if (!id) id = slugify(name) || `component-${seenIds.size + 1}`;
      // Disambiguate collisions (two components with the same id slug
      // would otherwise share a node on the diagram and lose edges).
      if (seenIds.has(id)) {
        let n = 2;
        while (seenIds.has(`${id}-${n}`)) n += 1;
        id = `${id}-${n}`;
      }
      seenIds.add(id);
      return { id, name, role, category, technologies };
    })
    .filter((c): c is ArchitectureComponent => c !== null);
}

export type TechItem = { group: string; entries: string[] };

/**
 * Per-technology normalized item shape. The legacy `extractTechStack`
 * groups by category and emits string arrays per group — fine for the
 * compact preview but lossy for the workspace's Tech Stack page, which
 * wants per-item rationale text. This is the richer shape used there.
 */
export type NormalizedTechStackItem = {
  id: string;
  name: string;
  category: string | null;
  reason: string | null;
};

function makeTechItem(
  name: string,
  category: string | null,
  reason: string | null,
  index: number
): NormalizedTechStackItem {
  const base = slugify(`${name}${category ? `-${category}` : ""}`);
  const id = base.length > 0 ? base : `tech-${index + 1}`;
  return { id, name, category, reason };
}

/**
 * Extract individual tech-stack items from whichever shape the engine
 * produced. We support, in priority order:
 *
 *   - object form: { frontend: ["react", ...], backend: ["node"] }
 *   - object form with nested items: { data: [{ name, reason }, ...] }
 *   - flat array of strings: ["react", "node", "postgres"]
 *   - array of structured items: [{ name, category, reason }, ...]
 *   - array of grouped objects: [{ group, entries: [...] }, ...]
 *
 * Anything we don't recognize is dropped silently rather than crashing.
 */
export function extractTechStackItems(
  arch: Record<string, unknown>
): NormalizedTechStackItem[] {
  const stack = arch.techStack;
  const out: NormalizedTechStackItem[] = [];
  const seenIds = new Set<string>();
  const push = (
    name: string | null,
    category: string | null,
    reason: string | null
  ) => {
    if (!name) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    let item = makeTechItem(trimmed, category, reason, out.length);
    if (seenIds.has(item.id)) {
      let n = 2;
      while (seenIds.has(`${item.id}-${n}`)) n += 1;
      item = { ...item, id: `${item.id}-${n}` };
    }
    seenIds.add(item.id);
    out.push(item);
  };

  const obj = asObject(stack);
  if (obj) {
    for (const [group, value] of Object.entries(obj)) {
      const flat = asStringArray(value);
      if (flat.length > 0) {
        for (const n of flat) push(n, group, null);
        continue;
      }
      const single = asString(value);
      if (single) {
        push(single, group, null);
        continue;
      }
      const objArr = asObjectArray(value);
      if (objArr.length > 0) {
        for (const o of objArr) {
          const name =
            asString(o.name) ??
            asString(o.technology) ??
            asString(o.label) ??
            asString(o.tool);
          const category =
            asString(o.category) ??
            asString(o.type) ??
            asString(o.kind) ??
            group;
          const reason =
            asString(o.reason) ??
            asString(o.description) ??
            asString(o.purpose) ??
            asString(o.why);
          push(name, category, reason);
        }
        continue;
      }
      const valObj = asObject(value);
      if (valObj) {
        const name =
          asString(valObj.name) ??
          asString(valObj.technology) ??
          asString(valObj.label);
        const category =
          asString(valObj.category) ??
          asString(valObj.type) ??
          group;
        const reason =
          asString(valObj.reason) ??
          asString(valObj.description) ??
          asString(valObj.purpose);
        push(name, category, reason);
      }
    }
    return out;
  }

  const flatTop = asStringArray(stack);
  if (flatTop.length > 0) {
    for (const n of flatTop) push(n, null, null);
    return out;
  }

  const arr = asObjectArray(stack);
  if (arr.length > 0) {
    for (const o of arr) {
      // Legacy grouped form first: { group, entries: [...] }.
      const groupName =
        asString(o.group) ??
        asString(o.category) ??
        asString(o.layer) ??
        null;
      const entries = asStringArray(o.entries);
      const items = asStringArray(o.items);
      if (entries.length > 0) {
        for (const n of entries) push(n, groupName, null);
        continue;
      }
      if (items.length > 0) {
        for (const n of items) push(n, groupName, null);
        continue;
      }
      const name =
        asString(o.name) ??
        asString(o.technology) ??
        asString(o.label) ??
        asString(o.tool);
      const category =
        asString(o.category) ??
        asString(o.type) ??
        asString(o.kind) ??
        groupName;
      const reason =
        asString(o.reason) ??
        asString(o.description) ??
        asString(o.purpose) ??
        asString(o.why);
      push(name, category, reason);
    }
    return out;
  }

  return out;
}

export function extractTechStack(
  arch: Record<string, unknown>
): TechItem[] {
  const stack = arch.techStack;

  // Object form: { frontend: ["react"], backend: ["node"], … }
  const obj = asObject(stack);
  if (obj) {
    const out: TechItem[] = [];
    for (const [group, value] of Object.entries(obj)) {
      const entries = asStringArray(value);
      if (entries.length > 0) {
        out.push({ group, entries });
      } else {
        const single = asString(value);
        if (single) out.push({ group, entries: [single] });
      }
    }
    return out;
  }

  // Flat array of strings.
  const flat = asStringArray(stack);
  if (flat.length > 0) {
    return [{ group: "Stack", entries: flat }];
  }

  // Array of objects: { group, entries } / { name, category } / { layer, items }.
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

export function listPreview<T>(
  items: T[],
  max: number
): { shown: T[]; rest: number } {
  if (items.length <= max) return { shown: items, rest: 0 };
  return { shown: items.slice(0, max), rest: items.length - max };
}

export function architectureSummary(
  arch: Record<string, unknown>
): string | null {
  return (
    asString(arch.summary) ??
    asString(arch.overview) ??
    asString(arch.description)
  );
}

export function architecturePattern(
  arch: Record<string, unknown>
): string | null {
  return (
    asString(arch.patternUsed) ??
    asString(arch.pattern) ??
    asString(arch.architecturePattern)
  );
}

export function hasMermaidArtifact(
  arch: Record<string, unknown>
): boolean {
  return (
    asString(arch.mermaid) !== null ||
    asString(arch.diagram) !== null ||
    asObject(arch.diagram) !== null
  );
}

export function hasCostArtifact(arch: Record<string, unknown>): boolean {
  return (
    asObject(arch.cost) !== null ||
    asObject(arch.costEstimate) !== null ||
    asString(arch.costEstimate) !== null
  );
}

export function hasAlternativesArtifact(
  arch: Record<string, unknown>
): boolean {
  return asObjectArray(arch.alternatives).length > 0;
}

/* ════════════════════════════════════════════════════════════════════════
 * Wrapper-shape normalization
 *
 * Production now returns the AlternativeDecisionWithDerivedOutputs wrapper
 * (recommendedProfile + recommendation + tradeoffs + alternatives[]). We
 * normalize that into a single `architecture` plus side artifacts so
 * downstream components don't need to know which shape they got.
 * ════════════════════════════════════════════════════════════════════════ */

export type ArchitectureAlternativeSummary = {
  profile: string | null;
  /** Human-readable profile label (e.g. "Cost optimized"). */
  profileLabel: string | null;
  name: string | null;
  summary: string | null;
  /**
   * The unwrapped per-alternative architecture object if we found it.
   * Used so the board can swap which alternative it renders later
   * without having to re-walk the wrapper.
   */
  architecture: Record<string, unknown> | null;
  hasMermaid: boolean;
  hasCost: boolean;
  isRecommended: boolean;
};

export type ArchitectureTradeoffEntry = {
  label: string;
  detail: string | null;
};

export type ArchitectureRecommendation = {
  profile: string | null;
  profileLabel: string | null;
  explanation: string | null;
  reasonCodes: string[];
};

/**
 * Raw normalized edge between two components, as produced by the
 * backend (or whichever upstream graph source we end up reading). The
 * diagram resolves `from`/`to` against component ids first and then
 * against names so it tolerates either form.
 */
export type NormalizedArchitectureEdge = {
  from: string;
  to: string;
  label: string | null;
};

export type NormalizedArchitecture = {
  /** The selected architecture's core fields, ready for direct rendering. */
  architecture: Record<string, unknown> | null;
  /** True when the input arrived as the decision-wrapper shape. */
  isWrapper: boolean;
  recommendation: ArchitectureRecommendation | null;
  recommendedProfile: string | null;
  recommendedProfileLabel: string | null;
  alternatives: ArchitectureAlternativeSummary[];
  tradeoffs: ArchitectureTradeoffEntry[];
  /**
   * Component-to-component edges if the engine emitted them. Empty when
   * no edge data was found at any of the supported paths; callers fall
   * back to inferring high-level edges from layer order in that case.
   */
  edges: NormalizedArchitectureEdge[];
  /**
   * Raw Mermaid (or similar) diagram source string when the engine
   * emitted one. Extracted but not rendered in the current dashboard
   * — the diagram board renders its own SVG canvas. Kept here so a
   * later step can light up a "view source" affordance.
   */
  diagramSource: string | null;
};

/**
 * Try several plausible locations for a nested architecture object on
 * a wrapper entry (alternative) or on the wrapper root. Order matters:
 * `architecture` is the documented field; the rest are defensive.
 */
function pickNestedArchitecture(
  candidate: Record<string, unknown>
): Record<string, unknown> | null {
  const paths = [
    candidate.architecture,
    candidate.result,
    candidate.decision,
    candidate.output,
    candidate.payload,
  ];
  for (const p of paths) {
    const obj = asObject(p);
    if (obj && looksLikeArchitecture(obj)) return obj;
  }
  return null;
}

/**
 * Heuristic: a "direct architecture" object has at least one of these
 * shape-y fields. We use this both to detect that the top-level payload
 * is already direct and to pick the right nested object inside a wrapper
 * entry — e.g. so we don't accidentally pick a metadata object.
 */
function looksLikeArchitecture(o: Record<string, unknown>): boolean {
  if (Array.isArray(o.components)) return true;
  if (Array.isArray(o.keyDecisions)) return true;
  if (Array.isArray(o.scalingNotes)) return true;
  if (Array.isArray(o.securityNotes)) return true;
  if (Array.isArray(o.validationWarnings)) return true;
  if (asString(o.summary) || asString(o.overview)) return true;
  if (asString(o.patternUsed) || asString(o.pattern)) return true;
  return false;
}

function profileLabel(profile: string | null): string | null {
  if (!profile) return null;
  // Engine profiles are snake/kebab/camel-ish (e.g. "cost_optimized",
  // "balanced", "future_scale"). prettyEnum splits on underscores — for
  // kebab we substitute first.
  const normalized = profile.replace(/-/g, "_");
  return prettyEnum(normalized) ?? profile;
}

function buildAlternativeSummary(
  alt: Record<string, unknown>,
  recommendedProfile: string | null
): ArchitectureAlternativeSummary {
  const profile = asString(alt.profile);
  const inner = pickNestedArchitecture(alt);
  const summary =
    (inner ? architectureSummary(inner) : null) ??
    asString(alt.summary) ??
    asString(alt.overview);
  const name = asString(alt.name) ?? asString(alt.title) ?? profileLabel(profile);
  const hasMermaid =
    asString(alt.mermaid) !== null ||
    asString(alt.diagram) !== null ||
    asObject(alt.diagram) !== null ||
    (inner ? hasMermaidArtifact(inner) : false);
  const hasCost =
    asObject(alt.cost) !== null ||
    asObject(alt.costEstimate) !== null ||
    asString(alt.costEstimate) !== null ||
    (inner ? hasCostArtifact(inner) : false);
  return {
    profile,
    profileLabel: profileLabel(profile),
    name,
    summary,
    architecture: inner,
    hasMermaid,
    hasCost,
    isRecommended:
      profile !== null &&
      recommendedProfile !== null &&
      profile === recommendedProfile,
  };
}

/**
 * Defensive edge extraction. We probe several plausible locations on
 * the architecture object (the engine has migrated the property name a
 * few times). The first array that yields at least one well-formed
 * `{from, to}` pair wins.
 */
export function extractEdges(
  arch: Record<string, unknown>
): NormalizedArchitectureEdge[] {
  const graph = asObject(arch.graph);
  const diagram = asObject(arch.diagram);
  const flow = asObject(arch.flow);
  const candidates: unknown[] = [
    arch.edges,
    arch.connections,
    arch.links,
    arch.relationships,
    graph?.edges,
    graph?.connections,
    diagram?.edges,
    diagram?.connections,
    flow?.edges,
  ];
  for (const cand of candidates) {
    if (!Array.isArray(cand)) continue;
    const out: NormalizedArchitectureEdge[] = [];
    for (const raw of cand) {
      const o = asObject(raw);
      if (!o) continue;
      const from =
        asString(o.from) ??
        asString(o.source) ??
        asString(o.fromId) ??
        asString(o.sourceId) ??
        asString(o.src);
      const to =
        asString(o.to) ??
        asString(o.target) ??
        asString(o.toId) ??
        asString(o.targetId) ??
        asString(o.dst);
      if (!from || !to) continue;
      const label =
        asString(o.label) ??
        asString(o.kind) ??
        asString(o.type) ??
        asString(o.relation) ??
        null;
      out.push({ from, to, label });
    }
    if (out.length > 0) return out;
  }
  return [];
}

function buildTradeoffs(raw: unknown): ArchitectureTradeoffEntry[] {
  const arr = asObjectArray(raw);
  if (arr.length === 0) return [];
  return arr
    .map((row) => {
      const profile = asString(row.profile);
      const baseLabel = profileLabel(profile) ?? asString(row.label);
      if (!baseLabel) return null;
      const detailParts: string[] = [];
      const cost = asString(row.relativeCost);
      if (cost) detailParts.push(`Cost: ${prettyEnum(cost) ?? cost}`);
      const speed = asString(row.deliverySpeed);
      if (speed) detailParts.push(`Speed: ${prettyEnum(speed) ?? speed}`);
      const scale = asString(row.scaleReadiness);
      if (scale) detailParts.push(`Scale: ${prettyEnum(scale) ?? scale}`);
      const complexity = asString(row.operationalComplexity);
      if (complexity)
        detailParts.push(`Ops: ${prettyEnum(complexity) ?? complexity}`);
      const notes = asStringArray(row.notes);
      if (notes.length > 0) detailParts.push(notes.join(" • "));
      const explanation = asString(row.explanation) ?? asString(row.summary);
      const detail = explanation ?? (detailParts.length > 0 ? detailParts.join(" · ") : null);
      return { label: baseLabel, detail };
    })
    .filter((t): t is ArchitectureTradeoffEntry => t !== null);
}

function buildRecommendation(
  raw: unknown,
  recommendedProfile: string | null
): ArchitectureRecommendation | null {
  const obj = asObject(raw);
  if (!obj && !recommendedProfile) return null;
  const profile =
    asString(obj?.profile) ??
    asString(obj?.recommendedProfile) ??
    recommendedProfile;
  const explanation =
    asString(obj?.explanation) ??
    asString(obj?.rationale) ??
    asString(obj?.summary);
  const reasonCodes = obj ? asStringArray(obj.reasonCodes) : [];
  if (!profile && !explanation && reasonCodes.length === 0) return null;
  return {
    profile,
    profileLabel: profileLabel(profile),
    explanation,
    reasonCodes,
  };
}

/**
 * Normalize either shape into a single view. Always safe to call: if the
 * input is null/garbage we return a normalized record with `architecture:
 * null` so the rendering layer can show an empty state without branching
 * on the input shape.
 */
export function normalizeArchitectureResult(
  result: unknown
): NormalizedArchitecture {
  const root = asObject(result);
  if (!root) {
    return {
      architecture: null,
      isWrapper: false,
      recommendation: null,
      recommendedProfile: null,
      recommendedProfileLabel: null,
      alternatives: [],
      tradeoffs: [],
      edges: [],
      diagramSource: null,
    };
  }

  // Detect wrapper shape. The marker fields are recommendedProfile +
  // recommendation + (tradeoffs or alternatives). We accept either order
  // and any subset because the backend may evolve. If the top-level
  // already looks like a direct architecture, we treat it as direct
  // even if it happens to also carry an `alternatives` array.
  const topLevelIsArchitecture = looksLikeArchitecture(root);
  const recommendedProfile =
    asString(root.recommendedProfile) ??
    asString(asObject(root.recommendation)?.profile);
  const altsRaw = asObjectArray(root.alternatives);
  const isWrapper =
    !topLevelIsArchitecture &&
    (recommendedProfile !== null ||
      asObject(root.recommendation) !== null ||
      altsRaw.length > 0);

  if (!isWrapper) {
    // Direct architecture shape — pass it through. We still surface any
    // `alternatives` entries in case the backend co-located them.
    const alternatives = altsRaw.map((alt) =>
      buildAlternativeSummary(alt, recommendedProfile)
    );
    return {
      architecture: root,
      isWrapper: false,
      recommendation: buildRecommendation(root.recommendation, recommendedProfile),
      recommendedProfile,
      recommendedProfileLabel: profileLabel(recommendedProfile),
      alternatives,
      tradeoffs: buildTradeoffs(root.tradeoffs),
      edges: extractEdges(root),
      diagramSource: asString(root.mermaid) ?? asString(root.diagram),
    };
  }

  // Wrapper shape. Build per-alternative summaries, pick the recommended
  // one (or the first viable one as fallback), and surface its inner
  // architecture as the primary.
  const alternatives = altsRaw.map((alt) =>
    buildAlternativeSummary(alt, recommendedProfile)
  );
  const selected =
    alternatives.find((a) => a.isRecommended && a.architecture) ??
    alternatives.find((a) => a.architecture) ??
    alternatives[0] ??
    null;

  const architecture = selected ? selected.architecture : null;

  // For wrapper shape, edges and Mermaid live on the per-alternative
  // wrapper (mirroring the backend's `AlternativeWithDerivedOutputs`),
  // not on the inner architecture object. Look on both so we don't miss
  // either layout.
  const selectedRawAlt =
    altsRaw.find(
      (a) =>
        recommendedProfile !== null && asString(a.profile) === recommendedProfile
    ) ?? altsRaw[0];
  const edgesFromArchitecture = architecture ? extractEdges(architecture) : [];
  const edgesFromAlt = selectedRawAlt ? extractEdges(selectedRawAlt) : [];
  const edges =
    edgesFromArchitecture.length > 0 ? edgesFromArchitecture : edgesFromAlt;
  const diagramSource =
    (architecture
      ? asString(architecture.mermaid) ?? asString(architecture.diagram)
      : null) ??
    (selectedRawAlt
      ? asString(selectedRawAlt.mermaid) ?? asString(selectedRawAlt.diagram)
      : null);

  return {
    architecture,
    isWrapper: true,
    recommendation: buildRecommendation(root.recommendation, recommendedProfile),
    recommendedProfile:
      recommendedProfile ?? (selected ? selected.profile : null),
    recommendedProfileLabel:
      profileLabel(recommendedProfile) ??
      (selected ? selected.profileLabel : null),
    alternatives,
    tradeoffs: buildTradeoffs(root.tradeoffs),
    edges,
    diagramSource,
  };
}

/* ════════════════════════════════════════════════════════════════════════
 * Lightweight visual diagram lanes
 *
 * We do NOT depend on Mermaid in the dashboard yet. To still give the
 * user a "high-level diagram" sense of the architecture, we bucket the
 * extracted components into a handful of lanes (client / gateway /
 * service / data / external) and render them as a left-to-right flow.
 * The lane buckets are intentionally generous so anything we don't
 * recognize lands in `other` rather than getting dropped.
 * ════════════════════════════════════════════════════════════════════════ */

export type DiagramLaneKey =
  | "client"
  | "gateway"
  | "service"
  | "data"
  | "external";

export type DiagramLane = {
  key: DiagramLaneKey;
  label: string;
  description: string;
  components: ArchitectureComponent[];
};

const LANE_ORDER: DiagramLaneKey[] = [
  "client",
  "gateway",
  "service",
  "data",
  "external",
];

const LANE_META: Record<
  DiagramLaneKey,
  { label: string; description: string }
> = {
  client: { label: "Client", description: "User-facing apps & devices" },
  gateway: { label: "Edge / Gateway", description: "Entry, routing, auth" },
  service: { label: "Services", description: "Application & business logic" },
  data: { label: "Data", description: "Storage, cache, search, queues" },
  external: {
    label: "External",
    description: "Integrations, third-party, observability",
  },
};

function classifyComponent(c: ArchitectureComponent): DiagramLaneKey {
  const raw = ((c.category ?? "") + " " + c.name).toLowerCase();
  if (
    /\b(client|frontend|web|mobile|spa|app|ui|browser)\b/.test(raw)
  )
    return "client";
  if (
    /\b(gateway|edge|cdn|loadbalancer|load_balancer|lb|router|ingress|api_gateway|reverse_proxy|auth)\b/.test(
      raw
    )
  )
    return "gateway";
  if (
    /\b(database|datastore|postgres|mysql|sql|nosql|mongo|dynamo|cache|redis|memcached|queue|kafka|rabbit|sqs|search|elasticsearch|opensearch|warehouse|storage|s3|blob|object_store|bucket)\b/.test(
      raw
    )
  )
    return "data";
  if (
    /\b(external|integration|3rd|third_party|webhook|provider|saas|observability|monitoring|logging|tracing|analytics|email|sms|notification)\b/.test(
      raw
    )
  )
    return "external";
  return "service";
}

/**
 * Bucket components into ordered lanes for the lightweight diagram view.
 * Empty lanes are dropped so we don't render placeholder columns.
 */
export function buildDiagramLanes(
  components: ArchitectureComponent[]
): DiagramLane[] {
  const buckets: Record<DiagramLaneKey, ArchitectureComponent[]> = {
    client: [],
    gateway: [],
    service: [],
    data: [],
    external: [],
  };
  for (const c of components) {
    buckets[classifyComponent(c)].push(c);
  }
  return LANE_ORDER.map((key) => ({
    key,
    label: LANE_META[key].label,
    description: LANE_META[key].description,
    components: buckets[key],
  })).filter((lane) => lane.components.length > 0);
}
