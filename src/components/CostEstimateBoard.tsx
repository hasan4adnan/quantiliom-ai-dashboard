import { useMemo } from "react";
import {
  architecturePattern,
  normalizeArchitectureResult,
  prettyEnum,
  type NormalizedCost,
  type NormalizedCostLineItem,
} from "../lib/architectureResult";

/**
 * Workspace Cost Estimate page (Step 9p).
 *
 * Reads `cost` from `normalizeArchitectureResult` — the extractor
 * probes every supported path (selected architecture, recommended
 * alternative, recommendation, derivedOutputs/outputs, wrapper root)
 * and tolerates many shapes (string summary, `{ monthly }`,
 * `{ monthlyMinUsd, monthlyMaxUsd, confidence, lineItems }`, etc.).
 *
 * Layout:
 *   - Header: title + sub + profile/pattern/range chips
 *   - Range card: prominent currency range + confidence badge
 *   - Breakdown: compact line-item rows when present
 *   - Assumptions: concise bulleted notes when present
 *   - Summary card: when only a prose summary was emitted
 *   - Empty state: when nothing usable was found
 *
 * No backend calls, no persistence, no raw JSON.
 */

type Props = {
  architecture: unknown;
};

const RANGE_FORMATTER_CACHE = new Map<string, Intl.NumberFormat>();

function formatCurrencyValue(value: number, currency: string): string {
  // Whole-dollar formatting keeps the page premium — fractional cents
  // on a monthly range would feel like a billing receipt.
  const key = currency.toUpperCase();
  let fmt = RANGE_FORMATTER_CACHE.get(key);
  if (!fmt) {
    try {
      fmt = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: key,
        maximumFractionDigits: 0,
      });
    } catch {
      // Unknown currency code — fall back to plain locale formatting
      // with the code as a suffix so the page never explodes on a
      // shape it doesn't recognise.
      const fallback = new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 0,
      });
      return `${fallback.format(value)} ${key}`;
    }
    RANGE_FORMATTER_CACHE.set(key, fmt);
  }
  return fmt.format(value);
}

function formatRange(cost: NormalizedCost): string | null {
  const { monthlyMinUsd: min, monthlyMaxUsd: max, currency } = cost;
  if (min === null && max === null) return null;
  if (min !== null && max !== null) {
    if (min === max) return formatCurrencyValue(min, currency);
    return `${formatCurrencyValue(min, currency)} – ${formatCurrencyValue(max, currency)}`;
  }
  const single = min !== null ? min : max;
  return single !== null ? formatCurrencyValue(single, currency) : null;
}

function formatLineRange(
  item: NormalizedCostLineItem,
  currency: string
): string | null {
  const { monthlyMinUsd: min, monthlyMaxUsd: max } = item;
  if (min === null && max === null) return null;
  if (min !== null && max !== null) {
    if (min === max) return formatCurrencyValue(min, currency);
    return `${formatCurrencyValue(min, currency)} – ${formatCurrencyValue(max, currency)}`;
  }
  const single = min !== null ? min : max;
  return single !== null ? formatCurrencyValue(single, currency) : null;
}

export default function CostEstimateBoard({ architecture }: Props) {
  const normalized = useMemo(
    () => normalizeArchitectureResult(architecture),
    [architecture]
  );
  const cost = normalized.cost;
  const pattern = normalized.architecture
    ? architecturePattern(normalized.architecture)
    : null;
  const profileLabel = normalized.recommendedProfileLabel;

  const rangeText = cost ? formatRange(cost) : null;

  const chips: { label: string; value: string }[] = [];
  if (profileLabel) chips.push({ label: "Profile", value: profileLabel });
  if (pattern)
    chips.push({ label: "Pattern", value: prettyEnum(pattern) ?? pattern });
  if (rangeText) chips.push({ label: "Monthly", value: rangeText });

  return (
    <section className="cost-board" aria-label="Cost Estimate">
      <header className="cost-board-header">
        <span className="cost-board-eyebrow">Cost Estimate</span>
        <h1 className="cost-board-title">Cost Estimate</h1>
        <p className="cost-board-sub">
          Estimated operating cost for this architecture.
        </p>
        {chips.length > 0 ? (
          <div className="cost-board-chips">
            {chips.map((c) => (
              <span key={c.label} className="architecture-canvas-chip">
                <span>{c.label}</span>
                <strong>{c.value}</strong>
              </span>
            ))}
          </div>
        ) : null}
      </header>

      {!cost ? (
        <div className="cost-empty" role="status">
          Cost estimate is not available for this run.
        </div>
      ) : (
        <>
          {rangeText ? (
            <section className="cost-range-card" aria-label="Monthly cost range">
              <div className="cost-range-head">
                <span className="cost-range-label">Monthly cost</span>
                {cost.confidence ? (
                  <span
                    className={`cost-confidence cost-confidence--${cost.confidence.toLowerCase()}`}
                    title="Engine's confidence in this estimate."
                  >
                    {prettyEnum(cost.confidence) ?? cost.confidence} confidence
                  </span>
                ) : null}
              </div>
              <div className="cost-range-value">{rangeText}</div>
              <div className="cost-range-meta">
                <span>{cost.currency}</span>
                <span>·</span>
                <span>per month</span>
              </div>
            </section>
          ) : cost.summary ? (
            <section className="cost-summary-card" aria-label="Cost summary">
              <span className="cost-range-label">Summary</span>
              <p className="cost-summary-text">{cost.summary}</p>
            </section>
          ) : null}

          {cost.lineItems.length > 0 ? (
            <section className="cost-breakdown" aria-label="Cost breakdown">
              <div className="cost-section-head">
                <span className="cost-section-name">Breakdown</span>
                <span className="cost-section-count">
                  {cost.lineItems.length}
                </span>
              </div>
              <ul className="cost-line-list">
                {cost.lineItems.map((line) => (
                  <li key={line.id} className="cost-line">
                    <div className="cost-line-main">
                      <span className="cost-line-name">
                        {line.componentName ?? line.costDriver ?? "Component"}
                      </span>
                      {line.category ? (
                        <span className="cost-line-cat">
                          {prettyEnum(line.category) ?? line.category}
                        </span>
                      ) : null}
                    </div>
                    {line.costDriver && line.componentName ? (
                      <p className="cost-line-driver">{line.costDriver}</p>
                    ) : null}
                    {line.notes.length > 0 ? (
                      <ul className="cost-line-notes">
                        {line.notes.map((n, i) => (
                          <li key={i}>{n}</li>
                        ))}
                      </ul>
                    ) : null}
                    <span className="cost-line-value">
                      {formatLineRange(line, cost.currency) ?? "—"}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {rangeText && cost.summary ? (
            <section className="cost-summary-card" aria-label="Cost summary">
              <span className="cost-range-label">Summary</span>
              <p className="cost-summary-text">{cost.summary}</p>
            </section>
          ) : null}

          {cost.assumptions.length > 0 ? (
            <section className="cost-assumptions" aria-label="Assumptions">
              <div className="cost-section-head">
                <span className="cost-section-name">Assumptions</span>
                <span className="cost-section-count">
                  {cost.assumptions.length}
                </span>
              </div>
              <ul className="cost-assumption-list">
                {cost.assumptions.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </section>
  );
}
