import { useMemo } from "react";
import {
  architecturePattern,
  extractComponents,
  extractTechStackItems,
  normalizeArchitectureResult,
  prettyEnum,
  type NormalizedTechStackItem,
} from "../lib/architectureResult";

/**
 * Workspace Tech Stack page.
 *
 * Sibling to ArchitectureBoard inside the Architecture Workspace. Reads
 * the same normalized architecture result and surfaces the engine's
 * tech-stack recommendation grouped by category, plus a quiet
 * profile/pattern/count chip strip.
 *
 * Data path:
 *   1. `extractTechStackItems(arch)` for the structured items the engine
 *      emits (handles flat strings, grouped objects, nested per-item
 *      records).
 *   2. If empty, fall back to a per-component `technologies[]` sweep so
 *      we still surface something meaningful when the engine only put
 *      tech inside components.
 *   3. If still empty, render a calm empty state.
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

function slugifyLocal(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Normalize an engine category/name pair to one of the known display
 * groups. Pure keyword sniffing on lowercase text — anything we can't
 * place lands in "Other" rather than the dropped on the floor.
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
    /\b(backend|api|server|node|python|django|fastapi|express|nestjs|spring|rails|go|rust|java|graphql)\b/.test(
      test
    )
  )
    return "Backend";
  if (
    /\b(realtime|real[-_ ]?time|websocket|pubsub|socket|stream|sse)\b/.test(test)
  )
    return "Realtime";
  if (
    /\b(data|database|datastore|storage|cache|queue|search|postgres|mysql|mongo|dynamo|redis|kafka|rabbit|sqs|elasticsearch|opensearch|s3|sql|nosql|warehouse|blob|bucket)\b/.test(
      test
    )
  )
    return "Data";
  if (
    /\b(infra|infrastructure|deploy|kubernetes|k8s|docker|terraform|aws|gcp|azure|cloud|cdn|nginx|load[-_ ]?balancer|edge|ingress|hosting|vercel|netlify)\b/.test(
      test
    )
  )
    return "Infrastructure";
  if (
    /\b(auth|authn|authz|oauth|jwt|sso|firebase[-_ ]?auth|clerk|cognito|security|encryption|tls|iam|secrets|keycloak)\b/.test(
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
    /\b(integration|webhook|stripe|twilio|sendgrid|mailchimp|saas|3rd|third[-_ ]?party|provider|email|sms|notification)\b/.test(
      test
    )
  )
    return "Integrations";
  return "Other";
}

export default function TechStackBoard({ architecture }: Props) {
  const normalized = useMemo(
    () => normalizeArchitectureResult(architecture),
    [architecture]
  );
  const arch = normalized.architecture;

  const items = useMemo<NormalizedTechStackItem[]>(() => {
    if (!arch) return [];
    const primary = extractTechStackItems(arch);
    if (primary.length > 0) return primary;
    // Inference fallback: collect each component's `technologies[]` and
    // dedupe by lowercased name so a stack like "PostgreSQL" mentioned
    // by three components only appears once.
    const components = extractComponents(arch);
    const seen = new Set<string>();
    const out: NormalizedTechStackItem[] = [];
    let idx = 0;
    for (const c of components) {
      for (const t of c.technologies) {
        const key = t.trim().toLowerCase();
        if (!key || seen.has(key)) continue;
        seen.add(key);
        const slug = slugifyLocal(t) || `tech-${idx + 1}`;
        out.push({
          id: `infer-${slug}-${idx}`,
          name: t,
          category: c.category,
          reason: c.name,
        });
        idx += 1;
      }
    }
    return out;
  }, [arch]);

  const groups = useMemo<Group[]>(() => {
    if (items.length === 0) return [];
    const buckets = new Map<string, NormalizedTechStackItem[]>();
    for (const it of items) {
      const g = normalizeGroup(it.category, it.name);
      const arr = buckets.get(g);
      if (arr) arr.push(it);
      else buckets.set(g, [it]);
    }
    // Preserve our known display order; unknown buckets land at the
    // end alphabetically (defensive — normalizeGroup currently only
    // emits known labels, but a future edit might add more).
    const known = GROUP_ORDER.filter((g) => buckets.has(g));
    const unknown = [...buckets.keys()]
      .filter((g) => !GROUP_ORDER.includes(g))
      .sort();
    return [...known, ...unknown].map((g) => ({
      key: g,
      label: g,
      items: buckets.get(g) ?? [],
    }));
  }, [items]);

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
