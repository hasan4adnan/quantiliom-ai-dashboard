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
      // techChoice is the canonical per-component tech field in the
      // current backend schema ("the API service is Fastify"). Earlier
      // names (technologies/tech/stack/tools) are kept for tolerance
      // against shape drift.
      const techCandidates = [
        c.techChoice,
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
 * Property names that may carry the tech-stack list on the architecture
 * (or wrapper/recommendation/alternative) object.
 */
const TECH_STACK_KEYS: string[] = [
  "techStack",
  "tech_stack",
  "technologyStack",
  "technologies",
  "recommendedTechStack",
  "recommendedStack",
  "stack",
];

function pickTechName(o: Record<string, unknown>): string | null {
  // `choice` is the canonical TechStackItem field in the current backend
  // schema. The other names are kept so shape drift / earlier mocks /
  // partner data don't silently produce an empty page.
  return (
    asString(o.choice) ??
    asString(o.name) ??
    asString(o.technology) ??
    asString(o.label) ??
    asString(o.tool) ??
    asString(o.value)
  );
}

function pickTechCategory(o: Record<string, unknown>): string | null {
  return (
    asString(o.layer) ??
    asString(o.category) ??
    asString(o.type) ??
    asString(o.kind) ??
    asString(o.group)
  );
}

function pickTechReason(o: Record<string, unknown>): string | null {
  return (
    asString(o.rationale) ??
    asString(o.reason) ??
    asString(o.description) ??
    asString(o.purpose) ??
    asString(o.why) ??
    asString(o.justification)
  );
}

function readTechStackValue(stack: unknown): NormalizedTechStackItem[] {
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

  // 1. Object-of-… form: { frontend: ["React"], backend: [{name:..,reason:..}] }
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
          push(
            pickTechName(o),
            pickTechCategory(o) ?? group,
            pickTechReason(o)
          );
        }
        continue;
      }
      const valObj = asObject(value);
      if (valObj) {
        push(
          pickTechName(valObj),
          pickTechCategory(valObj) ?? group,
          pickTechReason(valObj)
        );
      }
    }
    return out;
  }

  // 2. Flat array of strings.
  const flatTop = asStringArray(stack);
  if (flatTop.length > 0) {
    for (const n of flatTop) push(n, null, null);
    return out;
  }

  // 3. Array of structured items — including legacy grouped form
  //    { group, entries } and the backend's { layer, choice, rationale }.
  const arr = asObjectArray(stack);
  if (arr.length > 0) {
    for (const o of arr) {
      const groupName = pickTechCategory(o);
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
      push(pickTechName(o), groupName, pickTechReason(o));
    }
    return out;
  }

  return out;
}

/**
 * Extract individual tech-stack items from a single architecture-like
 * object. Probes every property name in `TECH_STACK_KEYS` and returns
 * the first that yields a non-empty result. Anything we don't
 * recognize is dropped silently rather than crashing.
 */
export function extractTechStackItems(
  arch: Record<string, unknown>
): NormalizedTechStackItem[] {
  for (const key of TECH_STACK_KEYS) {
    const v = arch[key];
    if (v === undefined || v === null) continue;
    const items = readTechStackValue(v);
    if (items.length > 0) return items;
  }
  return [];
}

/* ════════════════════════════════════════════════════════════════════════
 * Narrative tech-mention extractor
 *
 * When the backend's structured `techStack` is empty (or the engine
 * skipped emitting it for a given run), the architecture text itself
 * usually still mentions concrete technologies in summary / component
 * roles / key decisions. This controlled dictionary lets the dashboard
 * surface those mentions as a fallback Tech Stack list so the user
 * isn't told "not available" when the page summary clearly says
 * "React + Fastify + PostgreSQL".
 *
 * Rules:
 *   - Case-insensitive whole-word match.
 *   - Canonical display name preserved (e.g. "Next.js" not "nextjs").
 *   - Bare "Go" is intentionally NOT a keyword because it collides
 *     with the English verb; "Golang" still matches the same canonical.
 *   - Each canonical entry fires at most once.
 * ════════════════════════════════════════════════════════════════════════ */

type TechDictionaryEntry = {
  canonical: string;
  group: string;
  aliases: string[];
};

const TECH_DICTIONARY: TechDictionaryEntry[] = [
  // Frontend
  { canonical: "React", group: "Frontend", aliases: ["react", "react.js", "reactjs"] },
  { canonical: "Next.js", group: "Frontend", aliases: ["next.js", "nextjs"] },
  { canonical: "Vite", group: "Frontend", aliases: ["vite"] },
  { canonical: "Vue", group: "Frontend", aliases: ["vue.js", "vuejs", "vue"] },
  { canonical: "Angular", group: "Frontend", aliases: ["angular"] },
  { canonical: "Swift", group: "Frontend", aliases: ["swift"] },
  { canonical: "Kotlin", group: "Frontend", aliases: ["kotlin"] },
  { canonical: "React Native", group: "Frontend", aliases: ["react native"] },
  { canonical: "Flutter", group: "Frontend", aliases: ["flutter"] },
  // Backend
  { canonical: "Node.js", group: "Backend", aliases: ["node.js", "nodejs", "node"] },
  { canonical: "Express", group: "Backend", aliases: ["express.js", "expressjs", "express"] },
  { canonical: "Fastify", group: "Backend", aliases: ["fastify"] },
  { canonical: "NestJS", group: "Backend", aliases: ["nest.js", "nestjs"] },
  { canonical: "Python", group: "Backend", aliases: ["python"] },
  { canonical: "Django", group: "Backend", aliases: ["django"] },
  { canonical: "FastAPI", group: "Backend", aliases: ["fastapi", "fast api"] },
  { canonical: "Java", group: "Backend", aliases: ["java"] },
  { canonical: "Spring Boot", group: "Backend", aliases: ["spring boot", "springboot"] },
  { canonical: "Go", group: "Backend", aliases: ["golang"] },
  // Data
  { canonical: "PostgreSQL", group: "Data", aliases: ["postgresql", "postgres"] },
  { canonical: "MySQL", group: "Data", aliases: ["mysql"] },
  { canonical: "MongoDB", group: "Data", aliases: ["mongodb", "mongo"] },
  { canonical: "Redis", group: "Data", aliases: ["redis"] },
  { canonical: "Elasticsearch", group: "Data", aliases: ["elasticsearch"] },
  { canonical: "OpenSearch", group: "Data", aliases: ["opensearch"] },
  { canonical: "DynamoDB", group: "Data", aliases: ["dynamodb"] },
  { canonical: "Firestore", group: "Data", aliases: ["firestore"] },
  { canonical: "Supabase", group: "Data", aliases: ["supabase"] },
  // Infrastructure / Cloud
  { canonical: "AWS", group: "Infrastructure", aliases: ["aws", "amazon web services"] },
  { canonical: "Google Cloud", group: "Infrastructure", aliases: ["google cloud", "gcp"] },
  { canonical: "Azure", group: "Infrastructure", aliases: ["azure"] },
  { canonical: "Docker", group: "Infrastructure", aliases: ["docker"] },
  { canonical: "Kubernetes", group: "Infrastructure", aliases: ["kubernetes", "k8s"] },
  { canonical: "Terraform", group: "Infrastructure", aliases: ["terraform"] },
  { canonical: "CloudFront", group: "Infrastructure", aliases: ["cloudfront"] },
  { canonical: "Amazon S3", group: "Infrastructure", aliases: ["amazon s3", "s3"] },
  { canonical: "AWS Lambda", group: "Infrastructure", aliases: ["aws lambda", "lambda"] },
  { canonical: "ECS", group: "Infrastructure", aliases: ["ecs"] },
  { canonical: "RDS", group: "Infrastructure", aliases: ["rds"] },
  { canonical: "Vercel", group: "Infrastructure", aliases: ["vercel"] },
  { canonical: "Netlify", group: "Infrastructure", aliases: ["netlify"] },
  // Realtime / Messaging
  { canonical: "WebSocket", group: "Realtime", aliases: ["websocket", "web socket", "websockets"] },
  { canonical: "Socket.IO", group: "Realtime", aliases: ["socket.io", "socketio"] },
  { canonical: "Kafka", group: "Realtime", aliases: ["kafka"] },
  { canonical: "RabbitMQ", group: "Realtime", aliases: ["rabbitmq", "rabbit mq"] },
  { canonical: "BullMQ", group: "Realtime", aliases: ["bullmq", "bull mq"] },
  { canonical: "Redis Pub/Sub", group: "Realtime", aliases: ["redis pub/sub", "redis pubsub"] },
  { canonical: "Firebase", group: "Realtime", aliases: ["firebase"] },
  // Auth / Payments / Integrations
  { canonical: "Firebase Auth", group: "Auth & Security", aliases: ["firebase auth", "firebase authentication"] },
  { canonical: "Auth0", group: "Auth & Security", aliases: ["auth0"] },
  { canonical: "Clerk", group: "Auth & Security", aliases: ["clerk"] },
  { canonical: "Stripe", group: "Integrations", aliases: ["stripe"] },
  { canonical: "SendGrid", group: "Integrations", aliases: ["sendgrid"] },
  { canonical: "Resend", group: "Integrations", aliases: ["resend"] },
  // Observability
  { canonical: "Sentry", group: "Observability", aliases: ["sentry"] },
  { canonical: "Datadog", group: "Observability", aliases: ["datadog"] },
  { canonical: "Prometheus", group: "Observability", aliases: ["prometheus"] },
  { canonical: "Grafana", group: "Observability", aliases: ["grafana"] },
  { canonical: "OpenTelemetry", group: "Observability", aliases: ["opentelemetry", "otel"] },
];

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Walk `text` and return one normalized item per dictionary entry whose
 * canonical or alias appears as a whole word. Used as the Tech Stack
 * fallback when the engine's structured techStack is empty.
 */
export function extractMentionedTechnologies(
  text: string
): NormalizedTechStackItem[] {
  if (!text || text.length === 0) return [];
  const out: NormalizedTechStackItem[] = [];
  const seen = new Set<string>();
  for (const entry of TECH_DICTIONARY) {
    for (const alias of entry.aliases) {
      // Use a non-letter boundary instead of \b so aliases that end in
      // a punctuation char (".js") still match — \b doesn't fire after
      // a non-word character.
      const pattern = new RegExp(
        `(^|[^A-Za-z0-9])${escapeRegex(alias)}([^A-Za-z0-9]|$)`,
        "i"
      );
      if (pattern.test(text)) {
        const key = entry.canonical.toLowerCase();
        if (seen.has(key)) break;
        seen.add(key);
        const slug = slugify(entry.canonical) || `mention-${out.length + 1}`;
        out.push({
          id: `mentioned-${slug}`,
          name: entry.canonical,
          category: entry.group,
          reason: "Mentioned in architecture output",
        });
        break;
      }
    }
  }
  return out;
}

/**
 * Concatenate every string-bearing field on an architecture object
 * that the engine fills with prose — used as the input to
 * extractMentionedTechnologies when no structured tech stack exists.
 */
export function gatherArchitectureText(
  arch: Record<string, unknown>
): string {
  const parts: string[] = [];
  const add = (v: unknown) => {
    const s = asString(v);
    if (s) parts.push(s);
  };
  add(arch.summary);
  add(arch.overview);
  add(arch.description);
  for (const note of asStringArray(arch.keyDecisions)) parts.push(note);
  for (const o of asObjectArray(arch.keyDecisions)) {
    add(o.topic);
    add(o.decision);
    add(o.rationale);
    add(o.summary);
  }
  for (const note of asStringArray(arch.scalingNotes)) parts.push(note);
  for (const note of asStringArray(arch.securityNotes)) parts.push(note);
  for (const note of asStringArray(arch.openQuestions)) parts.push(note);
  for (const c of asObjectArray(arch.components)) {
    add(c.name);
    add(c.role);
    add(c.rationale);
    add(c.description);
    add(c.purpose);
    add(c.techChoice);
    for (const a of asStringArray(c.alternatives)) parts.push(a);
    for (const a of asStringArray(c.technologies)) parts.push(a);
  }
  return parts.join(" \n ");
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
  /**
   * Number of architecture components in the per-alternative architecture
   * if we could unwrap it. 0 when the alt has no nested architecture or
   * the components array was empty.
   */
  componentCount: number;
  /**
   * Normalized cost estimate for THIS alternative (typically the wrapper's
   * `costEstimate` field, or the inner architecture's `cost` field).
   * Independent of the top-level `cost` returned by `normalizeArchitectureResult`.
   */
  cost: NormalizedCost | null;
  /**
   * Free-form strengths/risks/bestFor from the alternative entry itself
   * (some shapes carry these directly). The Alternatives board prefers
   * these when present and falls back to the matching tradeoff entry.
   */
  strengths: string[];
  risks: string[];
  bestFor: string[];
};

export type ArchitectureTradeoffEntry = {
  /** Profile slug (e.g. "cheap_mvp") if the row is tied to a profile. */
  profile: string | null;
  /** Always present — either the human-friendly profile label or `label`. */
  label: string;
  /** Short prose explanation, when the row carries one. */
  summary: string | null;
  strengths: string[];
  risks: string[];
  bestFor: string[];
  /** Engine's canonical four dimensions, when present. */
  relativeCost: string | null;
  deliverySpeed: string | null;
  scaleReadiness: string | null;
  operationalComplexity: string | null;
  /**
   * Legacy combined detail string. Filled when the input was a plain
   * string OR when no structured field is available — keeps older renderers
   * working without forcing the new board to use it.
   */
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

/**
 * Per-line cost item, normalized to the dashboard's shape regardless
 * of the exact backend field names. `monthlyMin/MaxUsd` mirror the
 * engine's stable contract; the optional component/category/driver
 * fields give the Cost Estimate page enough context to render
 * meaningful rows.
 */
export type NormalizedCostLineItem = {
  id: string;
  componentName: string | null;
  category: string | null;
  costDriver: string | null;
  monthlyMinUsd: number | null;
  monthlyMaxUsd: number | null;
  notes: string[];
};

export type NormalizedCost = {
  currency: string;
  monthlyMinUsd: number | null;
  monthlyMaxUsd: number | null;
  confidence: string | null;
  /** Short prose summary if the engine emitted one. */
  summary: string | null;
  assumptions: string[];
  lineItems: NormalizedCostLineItem[];
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
  /**
   * Structured tech-stack items extracted from any of the supported
   * paths (direct architecture, recommended alternative, recommendation,
   * derived outputs, wrapper root). Empty when none of those carry a
   * usable techStack.
   */
  techStackItems: NormalizedTechStackItem[];
  /**
   * Dictionary-based fallback — technologies mentioned in the
   * architecture's summary / components / decisions etc. Always
   * populated when there's prose to scan; the Tech Stack board uses
   * these only when `techStackItems` is empty.
   */
  techStackMentions: NormalizedTechStackItem[];
  /**
   * Normalized cost estimate (typically from the recommended
   * alternative's `costEstimate`). Null when no cost data was found.
   */
  cost: NormalizedCost | null;
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
    asString(alt.summary) ??
    asString(alt.overview) ??
    asString(alt.description) ??
    (inner ? architectureSummary(inner) : null);
  const name =
    asString(alt.name) ??
    asString(alt.title) ??
    asString(alt.label) ??
    profileLabel(profile);
  const hasMermaid =
    asString(alt.mermaid) !== null ||
    asString(alt.diagram) !== null ||
    asObject(alt.diagram) !== null ||
    (inner ? hasMermaidArtifact(inner) : false);
  // Per-alternative cost: prefer the wrapper's costEstimate (engine's
  // canonical location), fall back to alt.cost, then to the inner
  // architecture's cost. The structural extractor is the same one the
  // Cost Estimate page uses so the shape support stays consistent.
  const costFromAlt = extractCost(alt);
  const costFromInner = inner ? extractCost(inner) : null;
  const cost = costFromAlt ?? costFromInner;
  const hasCost = cost !== null;
  // Some alternative shapes carry their own strengths/risks/bestFor
  // directly (pros/cons/weaknesses are accepted aliases). We surface
  // them on the summary so the board can prefer them over the matching
  // tradeoff entry — useful when the engine emits per-alt narrative.
  const strengths =
    asStringArray(alt.strengths).length > 0
      ? asStringArray(alt.strengths)
      : asStringArray(alt.pros);
  const risks =
    asStringArray(alt.risks).length > 0
      ? asStringArray(alt.risks)
      : asStringArray(alt.weaknesses).length > 0
        ? asStringArray(alt.weaknesses)
        : asStringArray(alt.cons);
  const bestFor =
    asStringArray(alt.bestFor).length > 0
      ? asStringArray(alt.bestFor)
      : asStringArray(alt.best_for);
  const componentCount = inner ? extractComponents(inner).length : 0;
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
    componentCount,
    cost,
    strengths,
    risks,
    bestFor,
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

/**
 * Property names that may carry a cost estimate on the architecture
 * (or wrapper/recommendation/alternative) object.
 */
const COST_KEYS: string[] = [
  "cost",
  "costEstimate",
  "estimatedCost",
  "monthlyCost",
  "costs",
];

function asFiniteNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function readCostValue(raw: unknown): NormalizedCost | null {
  // Plain string summary — promote it as the cost's summary.
  const asStr = asString(raw);
  if (asStr) {
    return {
      currency: "USD",
      monthlyMinUsd: null,
      monthlyMaxUsd: null,
      confidence: null,
      summary: asStr,
      assumptions: [],
      lineItems: [],
    };
  }
  const obj = asObject(raw);
  if (!obj) return null;

  const currency = asString(obj.currency) ?? "USD";

  // Range fields — support every alias the brief listed plus the
  // backend's canonical `monthlyMin/MaxUsd`.
  let monthlyMin =
    asFiniteNumber(obj.monthlyMinUsd) ??
    asFiniteNumber(obj.monthlyMin) ??
    asFiniteNumber(obj.min) ??
    asFiniteNumber(obj.low);
  let monthlyMax =
    asFiniteNumber(obj.monthlyMaxUsd) ??
    asFiniteNumber(obj.monthlyMax) ??
    asFiniteNumber(obj.max) ??
    asFiniteNumber(obj.high);
  const exact =
    asFiniteNumber(obj.monthly) ??
    asFiniteNumber(obj.totalMonthly) ??
    asFiniteNumber(obj.estimatedMonthly);
  if (monthlyMin === null && monthlyMax === null && exact !== null) {
    monthlyMin = exact;
    monthlyMax = exact;
  }

  const confidence = asString(obj.confidence);
  const summary = asString(obj.summary) ?? asString(obj.range);

  const assumptions = asStringArray(obj.assumptions);
  const notes = asStringArray(obj.notes);

  // Line items — prioritize lineItems, then breakdown, then items.
  const itemSources = [obj.lineItems, obj.breakdown, obj.items];
  let rawItems: Record<string, unknown>[] = [];
  for (const src of itemSources) {
    const arr = asObjectArray(src);
    if (arr.length > 0) {
      rawItems = arr;
      break;
    }
  }
  const lineItems: NormalizedCostLineItem[] = rawItems.map((it, idx) => ({
    id:
      asString(it.componentId) ??
      asString(it.id) ??
      `line-${idx + 1}`,
    componentName:
      asString(it.componentName) ??
      asString(it.name) ??
      asString(it.label),
    category:
      asString(it.category) ??
      asString(it.type) ??
      asString(it.layer),
    costDriver:
      asString(it.costDriver) ??
      asString(it.driver) ??
      asString(it.reason) ??
      asString(it.description),
    monthlyMinUsd:
      asFiniteNumber(it.monthlyMinUsd) ??
      asFiniteNumber(it.min) ??
      asFiniteNumber(it.low),
    monthlyMaxUsd:
      asFiniteNumber(it.monthlyMaxUsd) ??
      asFiniteNumber(it.max) ??
      asFiniteNumber(it.high),
    notes: asStringArray(it.notes),
  }));

  // Drop the whole result when nothing usable was found — keeps the
  // board from rendering an empty card.
  if (
    monthlyMin === null &&
    monthlyMax === null &&
    summary === null &&
    lineItems.length === 0 &&
    assumptions.length === 0 &&
    notes.length === 0
  ) {
    return null;
  }

  return {
    currency,
    monthlyMinUsd: monthlyMin,
    monthlyMaxUsd: monthlyMax,
    confidence,
    summary,
    assumptions: assumptions.length > 0 ? assumptions : notes,
    lineItems,
  };
}

/**
 * Extract a normalized cost estimate from a single architecture-like
 * object. Probes every property name in `COST_KEYS` and returns the
 * first that yields a usable result.
 */
export function extractCost(
  arch: Record<string, unknown>
): NormalizedCost | null {
  for (const key of COST_KEYS) {
    const v = arch[key];
    if (v === undefined || v === null) continue;
    const result = readCostValue(v);
    if (result) return result;
  }
  return null;
}

/**
 * Dimension labels we recognise in the "matrix" tradeoff form, mapped to
 * the canonical engine field they fill on the per-profile entry. Anything
 * we don't recognise is dropped from the matrix view but still surfaced in
 * the per-profile entry's `detail` field so the data isn't silently lost.
 */
const DIMENSION_FIELD_MAP: Record<
  string,
  "relativeCost" | "deliverySpeed" | "scaleReadiness" | "operationalComplexity"
> = {
  cost: "relativeCost",
  price: "relativeCost",
  spend: "relativeCost",
  speed: "deliverySpeed",
  delivery: "deliverySpeed",
  deliveryspeed: "deliverySpeed",
  time: "deliverySpeed",
  timetoMarket: "deliverySpeed",
  scale: "scaleReadiness",
  scalability: "scaleReadiness",
  scaleReadiness: "scaleReadiness",
  growth: "scaleReadiness",
  ops: "operationalComplexity",
  operations: "operationalComplexity",
  operational: "operationalComplexity",
  operationalcomplexity: "operationalComplexity",
  complexity: "operationalComplexity",
};

const PROFILE_KEY_ALIASES: Record<string, string> = {
  cheap_mvp: "cheap_mvp",
  cheapmvp: "cheap_mvp",
  cheap: "cheap_mvp",
  mvp: "cheap_mvp",
  balanced: "balanced",
  scale_first: "scale_first",
  scalefirst: "scale_first",
  scale: "scale_first",
};

function emptyTradeoffEntry(
  profile: string | null,
  label: string
): ArchitectureTradeoffEntry {
  return {
    profile,
    label,
    summary: null,
    strengths: [],
    risks: [],
    bestFor: [],
    relativeCost: null,
    deliverySpeed: null,
    scaleReadiness: null,
    operationalComplexity: null,
    detail: null,
  };
}

function buildPerProfileTradeoff(
  row: Record<string, unknown>
): ArchitectureTradeoffEntry | null {
  const profile = asString(row.profile);
  const label =
    profileLabel(profile) ??
    asString(row.label) ??
    asString(row.name) ??
    asString(row.title);
  if (!label) return null;
  const summary =
    asString(row.summary) ??
    asString(row.explanation) ??
    asString(row.description) ??
    asString(row.overview);
  const strengths =
    asStringArray(row.strengths).length > 0
      ? asStringArray(row.strengths)
      : asStringArray(row.pros);
  const risks =
    asStringArray(row.risks).length > 0
      ? asStringArray(row.risks)
      : asStringArray(row.weaknesses).length > 0
        ? asStringArray(row.weaknesses)
        : asStringArray(row.cons);
  const bestFor =
    asStringArray(row.bestFor).length > 0
      ? asStringArray(row.bestFor)
      : asStringArray(row.best_for);
  const relativeCost = asString(row.relativeCost) ?? asString(row.cost);
  const deliverySpeed =
    asString(row.deliverySpeed) ?? asString(row.speed);
  const scaleReadiness =
    asString(row.scaleReadiness) ?? asString(row.scale);
  const operationalComplexity =
    asString(row.operationalComplexity) ??
    asString(row.opsComplexity) ??
    asString(row.complexity);
  const notes = asStringArray(row.notes);
  const detail = notes.length > 0 ? notes.join(" • ") : null;
  return {
    profile,
    label,
    summary,
    strengths,
    risks,
    bestFor,
    relativeCost,
    deliverySpeed,
    scaleReadiness,
    operationalComplexity,
    detail,
  };
}

/**
 * Pivot a dimension-keyed tradeoff matrix into per-profile entries.
 *
 *   [{ dimension: "Cost", cheap_mvp: "lowest", balanced: "moderate", … }]
 *   → entries keyed by profile, each carrying the corresponding field.
 *
 * Dimensions we don't recognise are concatenated into each profile's
 * `detail` so nothing is silently dropped.
 */
function pivotDimensionMatrix(
  rows: Record<string, unknown>[]
): ArchitectureTradeoffEntry[] {
  const profileEntries = new Map<string, ArchitectureTradeoffEntry>();
  const ensure = (profile: string): ArchitectureTradeoffEntry => {
    const existing = profileEntries.get(profile);
    if (existing) return existing;
    const created = emptyTradeoffEntry(profile, profileLabel(profile) ?? profile);
    profileEntries.set(profile, created);
    return created;
  };
  const extraDetails = new Map<string, string[]>();
  const pushExtra = (profile: string, line: string) => {
    const arr = extraDetails.get(profile) ?? [];
    arr.push(line);
    extraDetails.set(profile, arr);
  };

  for (const row of rows) {
    const dimensionRaw =
      asString(row.dimension) ??
      asString(row.name) ??
      asString(row.category) ??
      asString(row.label);
    if (!dimensionRaw) continue;
    const dimensionKey = dimensionRaw.toLowerCase().replace(/[\s_\-]/g, "");
    const field = DIMENSION_FIELD_MAP[dimensionKey] ?? null;

    for (const [rawKey, rawValue] of Object.entries(row)) {
      if (
        rawKey === "dimension" ||
        rawKey === "name" ||
        rawKey === "category" ||
        rawKey === "label"
      )
        continue;
      const profileKey = PROFILE_KEY_ALIASES[
        rawKey.toLowerCase().replace(/[\s_\-]/g, "")
      ];
      if (!profileKey) continue;
      const value = asString(rawValue);
      if (!value) continue;
      const entry = ensure(profileKey);
      if (field) {
        // Strict noUncheckedIndexedAccess-friendly assignment: index via
        // the known field name (no dynamic key access on the entry).
        if (field === "relativeCost") entry.relativeCost = value;
        else if (field === "deliverySpeed") entry.deliverySpeed = value;
        else if (field === "scaleReadiness") entry.scaleReadiness = value;
        else if (field === "operationalComplexity")
          entry.operationalComplexity = value;
      } else {
        pushExtra(profileKey, `${dimensionRaw}: ${value}`);
      }
    }
  }

  for (const [profile, lines] of extraDetails.entries()) {
    const entry = profileEntries.get(profile);
    if (entry) entry.detail = lines.join(" · ");
  }

  return [...profileEntries.values()];
}

function looksLikeDimensionMatrix(rows: Record<string, unknown>[]): boolean {
  if (rows.length === 0) return false;
  let dimensionRowCount = 0;
  for (const row of rows) {
    const hasDimensionKey =
      asString(row.dimension) !== null ||
      asString(row.category) !== null ||
      (asString(row.name) !== null && asString(row.profile) === null);
    if (!hasDimensionKey) continue;
    const hasProfileColumn = Object.keys(row).some((k) => {
      const canon = k.toLowerCase().replace(/[\s_\-]/g, "");
      return PROFILE_KEY_ALIASES[canon] !== undefined;
    });
    if (hasProfileColumn) dimensionRowCount += 1;
  }
  return dimensionRowCount >= 1 && dimensionRowCount === rows.length;
}

function buildTradeoffs(raw: unknown): ArchitectureTradeoffEntry[] {
  if (!Array.isArray(raw)) return [];

  // 1. Array of plain strings — promote each as a generic detail-only
  //    entry. Useful when the engine emits a short bulletted summary.
  const allStrings = raw.every(
    (x) => typeof x === "string" && x.trim().length > 0
  );
  if (allStrings) {
    return (raw as string[])
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map((s, i) => {
        const e = emptyTradeoffEntry(null, `Note ${i + 1}`);
        e.detail = s;
        return e;
      });
  }

  const arr = asObjectArray(raw);
  if (arr.length === 0) return [];

  // 2. Dimension matrix form — pivot into per-profile entries.
  if (looksLikeDimensionMatrix(arr)) {
    const pivoted = pivotDimensionMatrix(arr);
    if (pivoted.length > 0) return pivoted;
  }

  // 3. Per-profile canonical form (one entry per profile) — this is what
  //    the engine emits today.
  return arr
    .map((row) => buildPerProfileTradeoff(row))
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
    asString(obj?.choice) ??
    asString(obj?.selectedProfile) ??
    recommendedProfile;
  const explanation =
    asString(obj?.explanation) ??
    asString(obj?.rationale) ??
    asString(obj?.reason) ??
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
 * Probe every supported path for the alternatives array and return the
 * first non-empty hit. The order reflects spec priority: wrapper root,
 * recommendation, root-level synonyms.
 */
function collectAlternativesRaw(
  root: Record<string, unknown>,
  recommendationObj: Record<string, unknown> | null
): Record<string, unknown>[] {
  const candidates: unknown[] = [
    root.alternatives,
    root.profiles,
    root.options,
    recommendationObj?.alternatives,
    recommendationObj?.options,
  ];
  for (const c of candidates) {
    const arr = asObjectArray(c);
    if (arr.length > 0) return arr;
  }
  return [];
}

/**
 * Probe every supported path for the tradeoffs array and return the
 * first non-empty hit. Mirrors `collectAlternativesRaw` so the
 * normalizer is shape-tolerant on both fronts.
 */
function collectTradeoffsRaw(
  root: Record<string, unknown>,
  recommendationObj: Record<string, unknown> | null,
  selectedRawAlt: Record<string, unknown> | null
): unknown {
  const candidates: unknown[] = [
    root.tradeoffs,
    root.tradeOffs,
    root.trade_offs,
    recommendationObj?.tradeoffs,
    recommendationObj?.tradeOffs,
    selectedRawAlt?.tradeoffs,
    selectedRawAlt?.tradeOffs,
  ];
  for (const c of candidates) {
    if (c === undefined || c === null) continue;
    if (!Array.isArray(c)) continue;
    if (c.length === 0) continue;
    return c;
  }
  return [];
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
      techStackItems: [],
      techStackMentions: [],
      cost: null,
    };
  }

  // Detect wrapper shape. The marker fields are recommendedProfile +
  // recommendation + (tradeoffs or alternatives). We accept either order
  // and any subset because the backend may evolve. If the top-level
  // already looks like a direct architecture, we treat it as direct
  // even if it happens to also carry an `alternatives` array.
  const topLevelIsArchitecture = looksLikeArchitecture(root);
  const recommendationObj = asObject(root.recommendation);
  const recommendedProfile =
    asString(root.recommendedProfile) ??
    asString(recommendationObj?.profile) ??
    asString(recommendationObj?.recommendedProfile) ??
    asString(recommendationObj?.choice) ??
    asString(recommendationObj?.selectedProfile);
  const altsRaw = collectAlternativesRaw(root, recommendationObj);
  const isWrapper =
    !topLevelIsArchitecture &&
    (recommendedProfile !== null ||
      recommendationObj !== null ||
      altsRaw.length > 0);

  if (!isWrapper) {
    // Direct architecture shape — pass it through. We still surface any
    // `alternatives` entries in case the backend co-located them.
    const alternatives = altsRaw.map((alt) =>
      buildAlternativeSummary(alt, recommendedProfile)
    );
    const techSources = collectAuxSources(root, null, null);
    return {
      architecture: root,
      isWrapper: false,
      recommendation: buildRecommendation(root.recommendation, recommendedProfile),
      recommendedProfile,
      recommendedProfileLabel: profileLabel(recommendedProfile),
      alternatives,
      tradeoffs: buildTradeoffs(collectTradeoffsRaw(root, recommendationObj, null)),
      edges: extractEdges(root),
      diagramSource: asString(root.mermaid) ?? asString(root.diagram),
      techStackItems: findFirstNonEmpty(techSources, extractTechStackItems),
      techStackMentions: extractMentionedTechnologies(
        gatherArchitectureText(root)
      ),
      cost: findFirstTruthy(techSources, extractCost),
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

  const techSources = collectAuxSources(
    root,
    recommendationObj,
    selectedRawAlt ?? null
  );
  // For the narrative fallback we scan the inner architecture's prose
  // (where the engine actually writes summary / decisions / etc.) plus
  // the recommendation/alternative summaries the wrapper carries.
  const fallbackText = [
    architecture ? gatherArchitectureText(architecture) : "",
    asString(recommendationObj?.explanation) ?? "",
    asString(recommendationObj?.rationale) ?? "",
    selectedRawAlt ? (asString(selectedRawAlt.summary) ?? "") : "",
    selectedRawAlt ? (asString(selectedRawAlt.overview) ?? "") : "",
  ]
    .filter((s) => s.length > 0)
    .join(" \n ");

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
    tradeoffs: buildTradeoffs(
      collectTradeoffsRaw(root, recommendationObj, selectedRawAlt ?? null)
    ),
    edges,
    diagramSource,
    techStackItems: findFirstNonEmpty(techSources, extractTechStackItems),
    techStackMentions: extractMentionedTechnologies(fallbackText),
    cost: findFirstTruthy(techSources, extractCost),
  };
}

/**
 * Build the prioritized list of objects the tech-stack and cost
 * extractors should probe. The order reflects "most specific to least
 * specific": the chosen architecture and alternative are the canonical
 * source; the wrapper root is the last-resort catch-all. We also peek
 * inside `derivedOutputs` / `outputs` because that's where the engine
 * stamps per-alternative artifacts.
 */
function collectAuxSources(
  root: Record<string, unknown>,
  recommendationObj: Record<string, unknown> | null,
  selectedRawAlt: Record<string, unknown> | null
): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = [];
  const seen = new Set<Record<string, unknown>>();
  const push = (v: Record<string, unknown> | null | undefined) => {
    if (!v || seen.has(v)) return;
    seen.add(v);
    out.push(v);
  };
  const altDerived = selectedRawAlt
    ? asObject(selectedRawAlt.derivedOutputs)
    : null;
  const altOutputs = selectedRawAlt
    ? asObject(selectedRawAlt.outputs)
    : null;
  const altArch = selectedRawAlt
    ? pickNestedArchitecture(selectedRawAlt)
    : null;
  const recDerived = recommendationObj
    ? asObject(recommendationObj.derivedOutputs)
    : null;
  const recOutputs = recommendationObj
    ? asObject(recommendationObj.outputs)
    : null;
  push(altArch);
  push(selectedRawAlt);
  push(altDerived);
  push(altOutputs);
  push(recommendationObj);
  push(recDerived);
  push(recOutputs);
  push(root);
  return out;
}

function findFirstNonEmpty<T>(
  sources: Array<Record<string, unknown>>,
  extract: (src: Record<string, unknown>) => T[]
): T[] {
  for (const src of sources) {
    const items = extract(src);
    if (items.length > 0) return items;
  }
  return [];
}

function findFirstTruthy<T>(
  sources: Array<Record<string, unknown>>,
  extract: (src: Record<string, unknown>) => T | null
): T | null {
  for (const src of sources) {
    const v = extract(src);
    if (v) return v;
  }
  return null;
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
