import { useMemo } from "react";
import {
  architecturePattern,
  normalizeArchitectureResult,
  prettyEnum,
  type NormalizedTechStackItem,
} from "../lib/architectureResult";

/**
 * Workspace Tech Stack page (Step 9p).
 *
 * Reads `techStackItems` from `normalizeArchitectureResult` — that
 * function probes every supported path (selected architecture,
 * recommended alternative, recommendation, derivedOutputs/outputs,
 * wrapper root) and recognises the backend's `{ layer, choice,
 * rationale }` items as well as legacy shapes.
 *
 * If the structured stack is empty we render the engine's
 * `techStackMentions` instead — a controlled-dictionary extraction
 * from the architecture's prose (summary, components, decisions,
 * alternative summaries). A subtle caption tells the user the page
 * was built from mentions rather than an explicit stack.
 *
 * What this view intentionally does NOT do:
 *   - render raw JSON
 *   - render the full architecture report (board sections)
 *   - call any backend
 *   - persist anything
 */

type Props = {
  architecture: unknown;
};

type Group = {
  key: string;
  label: string;
  items: NormalizedTechStackItem[];
};

const GROUP_ORDER: string[] = [
  "Frontend",
  "Backend",
  "Realtime",
  "Data",
  "Infrastructure",
  "Auth & Security",
  "Observability",
  "Integrations",
  "Other",
];

/**
 * Map an engine-provided category label (e.g. "frontend",
 * "backend_language", "primary_database") to one of our display
 * groups. Falls back to a keyword sniff on the technology name when
 * the category itself doesn't carry enough signal.
 */
function normalizeGroup(rawCategory: string | null, name: string): string {
  const test = `${rawCategory ?? ""} ${name}`.toLowerCase();
  if (
    /\b(frontend|web|ui|client|browser|react|vue|angular|svelte|next|nuxt|tailwind|css)\b/.test(
      test
    )
  )
    return "Frontend";
  if (
    /\b(backend|api|server|node|python|django|fastapi|express|nestjs|fastify|spring|rails|rust|java|graphql)\b/.test(
      test
    )
  )
    return "Backend";
  if (
    /\b(realtime|real[-_ ]?time|websocket|pubsub|socket|stream|sse|kafka|rabbit|bullmq)\b/.test(
      test
    )
  )
    return "Realtime";
  if (
    /\b(data|database|datastore|storage|cache|queue|search|postgres|mysql|mongo|dynamo|redis|elasticsearch|opensearch|s3|sql|nosql|warehouse|blob|bucket|firestore|supabase)\b/.test(
      test
    )
  )
    return "Data";
  if (
    /\b(infra|infrastructure|deploy|kubernetes|k8s|docker|terraform|aws|gcp|azure|cloud|cdn|nginx|load[-_ ]?balancer|edge|ingress|hosting|vercel|netlify|lambda|ecs|rds|cloudfront)\b/.test(
      test
    )
  )
    return "Infrastructure";
  if (
    /\b(auth|authn|authz|oauth|jwt|sso|firebase[-_ ]?auth|clerk|cognito|security|encryption|tls|iam|secrets|auth0)\b/.test(
      test
    )
  )
    return "Auth & Security";
  if (
    /\b(observability|monitoring|logging|tracing|prometheus|grafana|sentry|datadog|metrics|loki|opentelemetry|otel)\b/.test(
      test
    )
  )
    return "Observability";
  if (
    /\b(integration|webhook|stripe|twilio|sendgrid|resend|mailchimp|saas|3rd|third[-_ ]?party|provider|email|sms|notification)\b/.test(
      test
    )
  )
    return "Integrations";
  return "Other";
}

function groupItems(items: NormalizedTechStackItem[]): Group[] {
  if (items.length === 0) return [];
  const buckets = new Map<string, NormalizedTechStackItem[]>();
  for (const it of items) {
    const g = normalizeGroup(it.category, it.name);
    const arr = buckets.get(g);
    if (arr) arr.push(it);
    else buckets.set(g, [it]);
  }
  const known = GROUP_ORDER.filter((g) => buckets.has(g));
  const unknown = [...buckets.keys()]
    .filter((g) => !GROUP_ORDER.includes(g))
    .sort();
  return [...known, ...unknown].map((g) => ({
    key: g,
    label: g,
    items: buckets.get(g) ?? [],
  }));
}

export default function TechStackBoard({ architecture }: Props) {
  const normalized = useMemo(
    () => normalizeArchitectureResult(architecture),
    [architecture]
  );

  // Prefer the engine's structured items; fall back to dictionary
  // mentions when none were emitted. We treat this as a single ordered
  // pipeline so the page is consistently non-empty when the architecture
  // text mentions concrete technologies.
  const isFallback =
    normalized.techStackItems.length === 0 &&
    normalized.techStackMentions.length > 0;
  const items = isFallback
    ? normalized.techStackMentions
    : normalized.techStackItems;
  const groups = useMemo(() => groupItems(items), [items]);

  const arch = normalized.architecture;
  const pattern = arch ? architecturePattern(arch) : null;
  const profileLabel = normalized.recommendedProfileLabel;

  const chips: { label: string; value: string }[] = [];
  if (profileLabel) chips.push({ label: "Profile", value: profileLabel });
  if (pattern)
    chips.push({ label: "Pattern", value: prettyEnum(pattern) ?? pattern });
  if (items.length > 0)
    chips.push({ label: "Technologies", value: String(items.length) });

  return (
    <section className="tech-stack-board" aria-label="Tech Stack">
      <header className="tech-stack-board-header">
        <span className="tech-stack-board-eyebrow">Tech Stack</span>
        <h1 className="tech-stack-board-title">Tech Stack</h1>
        <p className="tech-stack-board-sub">
          Recommended technologies for this architecture.
        </p>
        {chips.length > 0 ? (
          <div className="tech-stack-board-chips">
            {chips.map((c) => (
              <span key={c.label} className="architecture-canvas-chip">
                <span>{c.label}</span>
                <strong>{c.value}</strong>
              </span>
            ))}
          </div>
        ) : null}
        {isFallback ? (
          <p className="tech-stack-board-note" role="note">
            Extracted from the architecture output.
          </p>
        ) : null}
      </header>

      {items.length === 0 ? (
        <div className="tech-stack-empty" role="status">
          Tech stack recommendation is not available for this run.
        </div>
      ) : (
        <div className="tech-stack-groups">
          {groups.map((g) => (
            <section
              key={g.key}
              className="tech-stack-group"
              aria-label={g.label}
            >
              <div className="tech-stack-group-head">
                <span className="tech-stack-group-name">{g.label}</span>
                <span className="tech-stack-group-count">{g.items.length}</span>
              </div>
              <ul className="tech-stack-items">
                {g.items.map((it) => (
                  <li key={it.id} className="tech-stack-item">
                    <div className="tech-stack-item-head">
                      <span className="tech-stack-item-name">{it.name}</span>
                      {it.category ? (
                        <span className="tech-stack-item-cat">
                          {prettyEnum(it.category) ?? it.category}
                        </span>
                      ) : null}
                    </div>
                    {it.reason ? (
                      <p className="tech-stack-item-reason">{it.reason}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
