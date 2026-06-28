import {
  asBool,
  asObject,
  asString,
  asStringArray,
  type ArchitectureComponent,
  type NormalizedRoadmap,
  type NormalizedRoadmapPhase,
  type NormalizedTechStackItem,
} from "./architectureResult";

/**
 * Deterministic implementation-roadmap generator (Step 9s).
 *
 * Same inputs → same plan, every render. No LLM, no random IDs, no
 * persistence. Each phase pushes tasks only when there's an explicit
 * signal from components, requirements, or the recommended profile —
 * we don't invent specific features. Phases with zero tasks are
 * dropped so consumers don't see empty headers.
 *
 * Shared by RoadmapBoard and BacklogBoard so both render a consistent
 * plan when the engine doesn't emit a structured roadmap upstream.
 *
 * Keep this file pure: no React, no globals, no side effects.
 */

export type RoadmapFallbackInputs = {
  components: ArchitectureComponent[];
  techItems: NormalizedTechStackItem[];
  profile: string | null;
  requirements: Record<string, unknown> | null;
};

export type RequirementsLike = Record<string, unknown> | null;

/**
 * Accept the requirements object directly or under a wrapper key.
 * Mirrors the unwrap used by RequirementsBoard so both code paths see
 * the same shape.
 */
export function unwrapRequirements(input: unknown): RequirementsLike {
  const obj = asObject(input);
  if (!obj) return null;
  if (looksLikeRequirements(obj)) return obj;
  for (const key of [
    "requirements",
    "normalizedRequirements",
    "requirementSpec",
    "spec",
  ]) {
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
    "integrations" in o
  );
}

type Signals = {
  hasComponents: boolean;
  hasData: boolean;
  hasCache: boolean;
  hasQueue: boolean;
  hasSearch: boolean;
  hasStorage: boolean;
  hasRealtime: boolean;
  hasMedia: boolean;
  hasNotifications: boolean;
  hasPayments: boolean;
  hasAuth: boolean;
  hasAdminPanel: boolean;
  hasAnalytics: boolean;
  hasIntegrations: boolean;
  hasObservability: boolean;
  hasMobile: boolean;
  highSensitivity: boolean;
  isScaleFirst: boolean;
};

function categoryMatches(
  components: ArchitectureComponent[],
  needle: RegExp
): boolean {
  for (const c of components) {
    const text = `${c.category ?? ""} ${c.name}`.toLowerCase();
    if (needle.test(text)) return true;
  }
  return false;
}

function deriveSignals(inputs: RoadmapFallbackInputs): Signals {
  const { components, requirements: r, profile } = inputs;
  const reqPayments = asObject(r?.payments);
  const reqMobile = asObject(r?.mobile);
  const reqMedia = asObject(r?.media);
  const reqSecurity = asObject(r?.security);
  const sensitivity = asString(reqSecurity?.sensitivity);
  return {
    hasComponents: components.length > 0,
    hasData: categoryMatches(components, /\b(datastore|database|sql|nosql|warehouse)\b/),
    hasCache: categoryMatches(components, /\b(cache|redis|memcached)\b/),
    hasQueue: categoryMatches(components, /\b(queue|kafka|rabbit|sqs|bullmq)\b/),
    hasSearch: categoryMatches(components, /\b(search|elasticsearch|opensearch)\b/),
    hasStorage:
      categoryMatches(components, /\b(storage|s3|blob|bucket|cdn)\b/) ||
      (asBool(reqMedia?.uploads) ?? false),
    hasRealtime:
      categoryMatches(components, /\b(realtime|websocket|stream|pubsub)\b/) ||
      (asBool(r?.realtime) ?? false),
    hasMedia: asBool(reqMedia?.uploads) ?? false,
    hasNotifications: asBool(r?.notifications) ?? false,
    hasPayments:
      (asBool(reqPayments?.required) ?? false) ||
      asStringArray(reqPayments?.providers).length > 0,
    hasAuth:
      categoryMatches(components, /\b(auth|iam|identity)\b/) ||
      sensitivity === "medium" ||
      sensitivity === "high",
    hasAdminPanel: asBool(r?.adminPanel) ?? false,
    hasAnalytics:
      (asBool(r?.analytics) ?? false) ||
      categoryMatches(components, /\b(analytics|reporting)\b/),
    hasIntegrations:
      asStringArray(r?.integrations).length > 0 ||
      categoryMatches(components, /\b(external|integration|3rd|third[-_ ]?party|webhook)\b/),
    hasObservability:
      categoryMatches(components, /\b(observability|monitoring|logging|tracing)\b/),
    hasMobile: asBool(reqMobile?.required) ?? false,
    highSensitivity: sensitivity === "high",
    isScaleFirst: profile === "scale_first",
  };
}

type PhaseDraft = {
  id: string;
  title: string;
  summary: string;
  duration: string;
  tasks: Array<{ title: string; category?: string; description?: string }>;
  outcomes: string[];
};

export function generateFallbackRoadmap(
  inputs: RoadmapFallbackInputs
): NormalizedRoadmap | null {
  const s = deriveSignals(inputs);
  if (!s.hasComponents && !inputs.requirements) return null;

  const drafts: PhaseDraft[] = [];

  // ── Phase 1: Foundation & setup ───────────────────────────────────────
  const foundation: PhaseDraft = {
    id: "foundation",
    title: "Foundation & setup",
    summary: "Stand up the repo, environments, and core baselines.",
    duration: "Week 1",
    tasks: [
      { title: "Initialise the repository and project skeleton", category: "setup" },
      { title: "Configure environments and secrets handling", category: "setup" },
      { title: "Wire local development and basic CI", category: "setup" },
    ],
    outcomes: ["A runnable empty app with CI on every PR."],
  };
  if (s.hasData) {
    foundation.tasks.push({
      title: "Provision the primary datastore and define initial schema",
      category: "data",
    });
  }
  if (s.hasAuth) {
    foundation.tasks.push({
      title: "Set up authentication and basic authorization",
      category: "auth",
    });
  }
  drafts.push(foundation);

  // ── Phase 2: Core MVP ─────────────────────────────────────────────────
  const core: PhaseDraft = {
    id: "core-mvp",
    title: "Core MVP",
    summary: "Build the smallest end-to-end slice users can interact with.",
    duration: "Weeks 2–5",
    tasks: [
      { title: "Implement the primary client surface", category: "frontend" },
      { title: "Implement core API endpoints and services", category: "backend" },
      { title: "Wire end-to-end data flows for the main user journey", category: "backend" },
    ],
    outcomes: ["A clickable, deployable MVP covering the primary flow."],
  };
  if (s.hasMobile) {
    core.tasks.push({
      title: "Stand up the mobile / responsive client surface",
      category: "frontend",
    });
  }
  if (s.hasAdminPanel) {
    core.tasks.push({
      title: "Build the internal admin / back-office surface",
      category: "frontend",
    });
  }
  if (s.hasStorage) {
    core.tasks.push({
      title: "Implement media upload, storage, and serving",
      category: "data",
    });
  }
  drafts.push(core);

  // ── Phase 3: Integrations & realtime ──────────────────────────────────
  const integrations: PhaseDraft = {
    id: "integrations",
    title: "Integrations & realtime",
    summary: "Add the third-party and live-experience surfaces.",
    duration: "Weeks 4–6",
    tasks: [],
    outcomes: [],
  };
  if (s.hasPayments) {
    integrations.tasks.push({
      title: "Integrate the payment provider and handle webhooks",
      category: "payments",
    });
  }
  if (s.hasNotifications) {
    integrations.tasks.push({
      title: "Wire transactional notifications (email / SMS / push)",
      category: "notifications",
    });
  }
  if (s.hasRealtime) {
    integrations.tasks.push({
      title: "Stand up the realtime channel (WebSocket / pub-sub)",
      category: "realtime",
    });
  }
  if (s.hasIntegrations) {
    integrations.tasks.push({
      title: "Connect required third-party integrations",
      category: "integrations",
    });
  }
  if (integrations.tasks.length > 0) {
    integrations.outcomes.push(
      "All external surfaces functioning end-to-end in staging."
    );
    drafts.push(integrations);
  }

  // ── Phase 4: Reliability & launch readiness ───────────────────────────
  const reliability: PhaseDraft = {
    id: "reliability",
    title: "Reliability & launch readiness",
    summary: "Harden the system so it can go to real users.",
    duration: "Weeks 6–8",
    tasks: [
      { title: "Add automated test coverage for critical paths", category: "qa" },
      { title: "Set up the production deployment pipeline", category: "ops" },
    ],
    outcomes: ["A repeatable release process with rollback and observability."],
  };
  if (s.hasAuth || s.highSensitivity) {
    reliability.tasks.push({
      title: "Security hardening (TLS, secrets, IAM, least-privilege)",
      category: "security",
    });
  }
  reliability.tasks.push({
    title: "Set up logging, metrics, and basic alerting",
    category: "observability",
  });
  if (s.hasData) {
    reliability.tasks.push({
      title: "Configure database backups and restore drills",
      category: "data",
    });
  }
  drafts.push(reliability);

  // ── Phase 5: Post-MVP scaling ─────────────────────────────────────────
  const scaling: PhaseDraft = {
    id: "scaling",
    title: "Post-MVP scaling",
    summary: "Optimise once you have real traffic and feedback.",
    duration: "Post-launch",
    tasks: [],
    outcomes: [],
  };
  if (s.hasCache) {
    scaling.tasks.push({
      title: "Introduce caching for hot read paths",
      category: "performance",
    });
  }
  if (s.hasQueue) {
    scaling.tasks.push({
      title: "Move long-running work onto the queue",
      category: "performance",
    });
  }
  if (s.hasSearch) {
    scaling.tasks.push({
      title: "Tune the search index and relevance",
      category: "performance",
    });
  }
  if (s.hasAnalytics) {
    scaling.tasks.push({
      title: "Build analytics and reporting dashboards",
      category: "analytics",
    });
  }
  if (s.hasObservability || s.isScaleFirst) {
    scaling.tasks.push({
      title: "Expand observability (tracing, SLOs, error budgets)",
      category: "observability",
    });
  }
  if (s.isScaleFirst) {
    scaling.tasks.push({
      title: "Load test the critical paths and tune capacity",
      category: "performance",
    });
  }
  scaling.tasks.push({
    title: "Review cloud spend and right-size provisioned resources",
    category: "cost",
  });
  if (scaling.tasks.length > 0) {
    scaling.outcomes.push("Headroom for the next order of magnitude of users.");
    drafts.push(scaling);
  }

  const phases: NormalizedRoadmapPhase[] = drafts
    .filter((d) => d.tasks.length > 0)
    .map((d) => ({
      id: d.id,
      title: d.title,
      summary: d.summary,
      duration: d.duration,
      outcomes: d.outcomes,
      tasks: d.tasks.map((t, ti) => ({
        id: `${d.id}-${ti + 1}`,
        title: t.title,
        description: t.description ?? null,
        category: t.category ?? null,
      })),
    }));

  if (phases.length === 0) return null;
  return { phases, summary: null };
}
