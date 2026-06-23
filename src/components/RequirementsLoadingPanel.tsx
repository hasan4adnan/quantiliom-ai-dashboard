import { useEffect, useState } from "react";

/**
 * Stepped loading animation for the requirements synthesis phase. The
 * four steps below are a visual reassurance only — the backend does not
 * report progress, so we advance the active step on a fixed cadence.
 * The final step stays "active" until the parent transitions us away.
 *
 * Reuses the .discovery-loading-card + .discovery-step* CSS from the
 * discovery loading panel so the two phases feel consistent.
 */
const STEPS: string[] = [
  "Reviewing discovery answers",
  "Resolving product assumptions",
  "Normalizing scale and feature requirements",
  "Preparing architecture-ready requirements",
];

const STEP_ADVANCE_MS = 3200;

type Props = {
  onCancel: () => void;
};

export default function RequirementsLoadingPanel({ onCancel }: Props) {
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
        Requirements
      </div>
      <h2 className="discovery-flow-title">Synthesizing requirements</h2>
      <p className="discovery-flow-sub">
        We&rsquo;re converting your answers into a structured product brief
        the architecture stage can build on. This usually takes about a
        minute.
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
