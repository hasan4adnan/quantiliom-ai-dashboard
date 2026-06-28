import { useMemo } from "react";
import {
  architecturePattern,
  normalizeArchitectureResult,
  prettyEnum,
  type ArchitectureAlternativeSummary,
  type ArchitectureTradeoffEntry,
  type NormalizedCost,
} from "../lib/architectureResult";

/**
 * Workspace Alternatives page (Step 9q).
 *
 * Comparison surface for the architecture profiles the engine generated.
 * Built on top of `normalizeArchitectureResult` — no new backend calls,
 * no persistence, no raw JSON.
 *
 * Layout:
 *   1. Header: title + sub + recommended profile / alt count / pattern chips
 *   2. Recommended profile card (prominent) when we have a recommendation
 *   3. Per-profile alternative cards (Cheap MVP / Balanced / Scale first)
 *   4. Trade-off matrix synthesised from the engine's per-profile rows
 *   5. Empty states when nothing usable was found
 *
 * What this view intentionally does NOT do:
 *   - render raw JSON
 *   - call any backend
 *   - persist anything (storage, URL)
 *   - reintroduce the full architecture report
 */

type Props = {
  architecture: unknown;
};

const MATRIX_DIMENSIONS: Array<{
  key: "relativeCost" | "deliverySpeed" | "scaleReadiness" | "operationalComplexity";
  label: string;
}> = [
  { key: "relativeCost", label: "Cost" },
  { key: "deliverySpeed", label: "Speed" },
  { key: "scaleReadiness", label: "Scalability" },
  { key: "operationalComplexity", label: "Operational complexity" },
];

const FORMATTER_CACHE = new Map<string, Intl.NumberFormat>();

function getFormatter(currency: string): Intl.NumberFormat | null {
  const key = currency.toUpperCase();
  const cached = FORMATTER_CACHE.get(key);
  if (cached) return cached;
  try {
    const fmt = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: key,
      maximumFractionDigits: 0,
    });
    FORMATTER_CACHE.set(key, fmt);
    return fmt;
  } catch {
    return null;
  }
}

function formatCurrency(value: number, currency: string): string {
  const fmt = getFormatter(currency);
  if (fmt) return fmt.format(value);
  const fallback = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
  return `${fallback.format(value)} ${currency.toUpperCase()}`;
}

function formatCostHint(cost: NormalizedCost): string | null {
  const { monthlyMinUsd: min, monthlyMaxUsd: max, currency } = cost;
  if (min === null && max === null) return null;
  if (min !== null && max !== null) {
    if (min === max) return `${formatCurrency(min, currency)}/mo`;
    return `${formatCurrency(min, currency)} – ${formatCurrency(max, currency)}/mo`;
  }
  const single = min !== null ? min : max;
  return single !== null ? `${formatCurrency(single, currency)}/mo` : null;
}

function findTradeoff(
  alt: ArchitectureAlternativeSummary,
  tradeoffs: ArchitectureTradeoffEntry[]
): ArchitectureTradeoffEntry | null {
  if (!alt.profile) return null;
  return tradeoffs.find((t) => t.profile === alt.profile) ?? null;
}

/**
 * The matrix is meaningful only when at least one profile has at least
 * one of the four canonical dimensions filled. Cheap heuristic that
 * keeps an empty card from rendering when the engine emitted only prose.
 */
function hasMatrixData(tradeoffs: ArchitectureTradeoffEntry[]): boolean {
  return tradeoffs.some(
    (t) =>
      t.relativeCost !== null ||
      t.deliverySpeed !== null ||
      t.scaleReadiness !== null ||
      t.operationalComplexity !== null
  );
}

export default function AlternativesBoard({ architecture }: Props) {
  const normalized = useMemo(
    () => normalizeArchitectureResult(architecture),
    [architecture]
  );

  const alternatives = normalized.alternatives;
  const tradeoffs = normalized.tradeoffs;
  const recommendation = normalized.recommendation;
  const recommendedProfileLabel = normalized.recommendedProfileLabel;
  const pattern = normalized.architecture
    ? architecturePattern(normalized.architecture)
    : null;

  const chips: { label: string; value: string }[] = [];
  if (recommendedProfileLabel)
    chips.push({ label: "Recommended", value: recommendedProfileLabel });
  if (alternatives.length > 0)
    chips.push({ label: "Alternatives", value: String(alternatives.length) });
  if (pattern)
    chips.push({ label: "Pattern", value: prettyEnum(pattern) ?? pattern });

  const showMatrix = hasMatrixData(tradeoffs);
  const recommendedAlt =
    alternatives.find((a) => a.isRecommended) ?? null;
  const recommendationExplanation =
    recommendation?.explanation ?? recommendedAlt?.summary ?? null;

  const isEmpty = alternatives.length === 0 && tradeoffs.length === 0;

  return (
    <section className="alternatives-board" aria-label="Alternatives">
      <header className="alternatives-board-header">
        <span className="alternatives-board-eyebrow">Alternatives</span>
        <h1 className="alternatives-board-title">Alternatives</h1>
        <p className="alternatives-board-sub">
          Compare architecture profiles and trade-offs for this run.
        </p>
        {chips.length > 0 ? (
          <div className="alternatives-board-chips">
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
        <div className="alt-empty" role="status">
          Alternative architecture profiles are not available for this run.
        </div>
      ) : (
        <>
          {recommendedProfileLabel ? (
            <section
              className="alt-recommended-card"
              aria-label="Recommended profile"
            >
              <div className="alt-recommended-head">
                <span className="alt-recommended-eyebrow">Recommended</span>
                <h2 className="alt-recommended-title">
                  {recommendedProfileLabel}
                </h2>
              </div>
              {recommendationExplanation ? (
                <p className="alt-recommended-explanation">
                  {recommendationExplanation}
                </p>
              ) : null}
              {recommendation && recommendation.reasonCodes.length > 0 ? (
                <ul
                  className="alt-recommended-codes"
                  aria-label="Reason codes"
                >
                  {recommendation.reasonCodes.map((code) => (
                    <li key={code}>
                      <code>{code}</code>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ) : null}

          {alternatives.length > 0 ? (
            <section
              className="alt-profile-grid-section"
              aria-label="Profile alternatives"
            >
              <div className="alt-section-head">
                <span className="alt-section-name">Profile alternatives</span>
                <span className="alt-section-count">{alternatives.length}</span>
              </div>
              <ul className="alt-profile-grid">
                {alternatives.map((alt) => (
                  <AlternativeCard
                    key={alt.profile ?? alt.name ?? String(Math.random())}
                    alt={alt}
                    tradeoff={findTradeoff(alt, tradeoffs)}
                  />
                ))}
              </ul>
            </section>
          ) : null}

          {showMatrix ? (
            <section
              className="alt-tradeoff-matrix-section"
              aria-label="Trade-off matrix"
            >
              <div className="alt-section-head">
                <span className="alt-section-name">Trade-offs</span>
                <span className="alt-section-count">
                  {MATRIX_DIMENSIONS.length}
                </span>
              </div>
              <TradeoffMatrix
                tradeoffs={tradeoffs}
                recommendedProfile={normalized.recommendedProfile}
              />
            </section>
          ) : tradeoffs.length > 0 ? (
            <section
              className="alt-tradeoff-list-section"
              aria-label="Trade-off notes"
            >
              <div className="alt-section-head">
                <span className="alt-section-name">Trade-offs</span>
                <span className="alt-section-count">{tradeoffs.length}</span>
              </div>
              <ul className="alt-tradeoff-list">
                {tradeoffs.map((t, i) => (
                  <li key={`${t.label}-${i}`} className="alt-tradeoff-note">
                    <span className="alt-tradeoff-note-label">{t.label}</span>
                    {t.detail || t.summary ? (
                      <p className="alt-tradeoff-note-text">
                        {t.summary ?? t.detail}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <section
              className="alt-tradeoff-empty-section"
              aria-label="Trade-offs"
            >
              <div className="alt-section-head">
                <span className="alt-section-name">Trade-offs</span>
              </div>
              <div className="alt-empty alt-empty--inline" role="status">
                Trade-off details are not available for this run.
              </div>
            </section>
          )}
        </>
      )}
    </section>
  );
}

function AlternativeCard({
  alt,
  tradeoff,
}: {
  alt: ArchitectureAlternativeSummary;
  tradeoff: ArchitectureTradeoffEntry | null;
}) {
  const label = alt.profileLabel ?? alt.name ?? alt.profile ?? "Alternative";
  const summary = alt.summary ?? tradeoff?.summary ?? null;
  const strengths =
    alt.strengths.length > 0 ? alt.strengths : (tradeoff?.strengths ?? []);
  const risks = alt.risks.length > 0 ? alt.risks : (tradeoff?.risks ?? []);
  const bestFor =
    alt.bestFor.length > 0 ? alt.bestFor : (tradeoff?.bestFor ?? []);
  const costHint = alt.cost ? formatCostHint(alt.cost) : null;
  const dims: Array<{ label: string; value: string }> = [];
  const dimSource = tradeoff;
  if (dimSource) {
    if (dimSource.relativeCost)
      dims.push({
        label: "Cost",
        value: prettyEnum(dimSource.relativeCost) ?? dimSource.relativeCost,
      });
    if (dimSource.deliverySpeed)
      dims.push({
        label: "Speed",
        value:
          prettyEnum(dimSource.deliverySpeed) ?? dimSource.deliverySpeed,
      });
    if (dimSource.scaleReadiness)
      dims.push({
        label: "Scale",
        value:
          prettyEnum(dimSource.scaleReadiness) ?? dimSource.scaleReadiness,
      });
    if (dimSource.operationalComplexity)
      dims.push({
        label: "Ops",
        value:
          prettyEnum(dimSource.operationalComplexity) ??
          dimSource.operationalComplexity,
      });
  }
  const className =
    "alt-profile-card" +
    (alt.isRecommended ? " alt-profile-card--recommended" : "");

  return (
    <li className={className}>
      <div className="alt-profile-card-head">
        <span className="alt-profile-card-name">{label}</span>
        {alt.isRecommended ? (
          <span className="alt-recommended-badge" aria-label="Recommended">
            Recommended
          </span>
        ) : null}
      </div>
      {summary ? (
        <p className="alt-profile-card-summary">{summary}</p>
      ) : null}

      {dims.length > 0 ? (
        <ul className="alt-profile-card-dims" aria-label="Trade-off summary">
          {dims.map((d) => (
            <li key={d.label} className="alt-profile-card-dim">
              <span className="alt-profile-card-dim-label">{d.label}</span>
              <span className="alt-profile-card-dim-value">{d.value}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {(alt.componentCount > 0 || costHint) ? (
        <div className="alt-profile-card-meta">
          {alt.componentCount > 0 ? (
            <span className="alt-profile-card-meta-item">
              <span className="alt-profile-card-meta-label">Components</span>
              <span className="alt-profile-card-meta-value">
                {alt.componentCount}
              </span>
            </span>
          ) : null}
          {costHint ? (
            <span className="alt-profile-card-meta-item">
              <span className="alt-profile-card-meta-label">Cost</span>
              <span className="alt-profile-card-meta-value">{costHint}</span>
            </span>
          ) : null}
        </div>
      ) : null}

      {strengths.length > 0 || risks.length > 0 || bestFor.length > 0 ? (
        <div className="alt-profile-card-lists">
          {strengths.length > 0 ? (
            <div className="alt-profile-card-list">
              <span className="alt-profile-card-list-name">Strengths</span>
              <ul>
                {strengths.map((s, i) => (
                  <li key={`s-${i}`}>{s}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {risks.length > 0 ? (
            <div className="alt-profile-card-list">
              <span className="alt-profile-card-list-name">Risks</span>
              <ul>
                {risks.map((r, i) => (
                  <li key={`r-${i}`}>{r}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {bestFor.length > 0 ? (
            <div className="alt-profile-card-list">
              <span className="alt-profile-card-list-name">Best for</span>
              <ul>
                {bestFor.map((b, i) => (
                  <li key={`b-${i}`}>{b}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

function TradeoffMatrix({
  tradeoffs,
  recommendedProfile,
}: {
  tradeoffs: ArchitectureTradeoffEntry[];
  recommendedProfile: string | null;
}) {
  // Filter to rows that actually have a structured profile so the matrix
  // has stable columns. String-only entries are surfaced via the list
  // fallback above, not here.
  const rows = tradeoffs.filter((t) => t.profile !== null);
  if (rows.length === 0) return null;

  return (
    <div className="alt-tradeoff-matrix">
      <div className="alt-tradeoff-matrix-head">
        <span className="alt-tradeoff-matrix-corner" aria-hidden="true" />
        {rows.map((row) => {
          const isRecommended =
            recommendedProfile !== null && row.profile === recommendedProfile;
          return (
            <span
              key={row.profile ?? row.label}
              className={
                "alt-tradeoff-matrix-col" +
                (isRecommended ? " alt-tradeoff-matrix-col--recommended" : "")
              }
            >
              {row.label}
            </span>
          );
        })}
      </div>
      {MATRIX_DIMENSIONS.map((dim) => {
        const cells = rows.map((row) => row[dim.key]);
        const hasAny = cells.some((v) => v !== null);
        if (!hasAny) return null;
        return (
          <div key={dim.key} className="alt-tradeoff-matrix-row" role="row">
            <span className="alt-tradeoff-matrix-dim">{dim.label}</span>
            {rows.map((row, i) => {
              const value = cells[i] ?? null;
              const isRecommended =
                recommendedProfile !== null &&
                row.profile === recommendedProfile;
              return (
                <span
                  key={row.profile ?? `c-${i}`}
                  className={
                    "alt-tradeoff-matrix-cell" +
                    (isRecommended
                      ? " alt-tradeoff-matrix-cell--recommended"
                      : "")
                  }
                >
                  {value ? prettyEnum(value) ?? value : "—"}
                </span>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

