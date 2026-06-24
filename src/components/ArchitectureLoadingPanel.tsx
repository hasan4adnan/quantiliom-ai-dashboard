import { useEffect, useState } from "react";

/**
 * Stepped loading animation for the architecture decision phase. Steps
 * advance on a fixed cadence so we don't fabricate progress percentages
 * the backend can't actually report. The final step stays "active" until
 * the parent transitions us away.
 *
 * Reuses the .discovery-loading-card + .discovery-step* CSS so all three
 * loading phases (discovery → requirements → architecture) feel like the
 * same visual family.
 */
const STEPS: string[] = [
  "Mapping core components",
  "Selecting architecture pattern",
  "Evaluating tech stack",
  "Preparing decision output",
];

const STEP_ADVANCE_MS = 3600;

type Props = {
  onCancel: () => void;
};

export default function ArchitectureLoadingPanel({ onCancel }: Props) {
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
        Architecture
      </div>
      <h2 className="discovery-flow-title">Generating architecture</h2>
      <p className="discovery-flow-sub">
        We&rsquo;re evaluating system components, technical trade-offs,
        scalability, and deployment implications based on your normalized
        requirements. This usually takes about a minute.
      </p>

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
