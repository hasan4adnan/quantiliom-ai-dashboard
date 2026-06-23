import { useEffect, useState } from "react";

/**
 * Stepped loading animation for the discovery flow. The four steps below
 * are a visual reassurance only — the backend does not report progress,
 * so we advance the active step on a fixed cadence. The final step stays
 * "active" until the parent transitions us away.
 */
const STEPS: string[] = [
  "Reading product brief",
  "Detecting domain and core workflow",
  "Identifying missing architecture decisions",
  "Preparing discovery questions",
];

const STEP_ADVANCE_MS = 2800;

type Props = {
  description: string;
  onCancel: () => void;
};

export default function DiscoveryLoadingPanel({ description, onCancel }: Props) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setActive((prev) => (prev < STEPS.length - 1 ? prev + 1 : prev));
    }, STEP_ADVANCE_MS);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      className="discovery-loading-card"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="discovery-flow-eyebrow">
        <span className="discovery-flow-eyebrow-dot" aria-hidden="true" />
        Discovery
      </div>
      <h2 className="discovery-flow-title">Analyzing your architecture brief</h2>
      <p className="discovery-flow-sub">
        We&rsquo;re mapping your product domain, risks, integrations, and the
        decisions you haven&rsquo;t made yet. Hold on while we prepare a focused
        set of discovery questions.
      </p>

      <blockquote className="discovery-brief-quote">{description}</blockquote>

      <ul className="discovery-step-list">
        {STEPS.map((label, i) => {
          const state =
            i < active ? "is-done" : i === active ? "is-active" : "is-pending";
          return (
            <li key={label} className={`discovery-step ${state}`}>
              <span className="discovery-step-icon" aria-hidden="true">
                {i < active ? (
                  <span className="discovery-step-check">✓</span>
                ) : i === active ? (
                  <span className="discovery-step-spinner" />
                ) : null}
              </span>
              <span className="discovery-step-label">{label}</span>
            </li>
          );
        })}
      </ul>

      <div className="discovery-flow-foot">
        <button
          type="button"
          className="wiz-btn wiz-btn-ghost"
          onClick={onCancel}
        >
          Cancel and start over
        </button>
      </div>
    </div>
  );
}
