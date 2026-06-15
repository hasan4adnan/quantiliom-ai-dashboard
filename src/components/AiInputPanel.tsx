import { useEffect, useRef, useState } from "react";
import { ArrowRightIcon } from "./icons";

const EXAMPLES: { label: string; seed: string }[] = [
  {
    label: "SaaS MVP",
    seed: "A multi-tenant SaaS for small marketing teams to plan and schedule content campaigns.",
  },
  {
    label: "Mobile app",
    seed: "An iOS + Android habit tracker with offline sync and weekly insight reports.",
  },
  {
    label: "AI tool",
    seed: "An internal AI assistant that summarises customer support tickets and proposes responses.",
  },
  {
    label: "Marketplace",
    seed: "A two-sided marketplace connecting freelance translators with publishers, with escrow payments.",
  },
  {
    label: "Internal dashboard",
    seed: "An internal ops dashboard for monitoring inventory across 12 warehouses in near real time.",
  },
];

export default function AiInputPanel() {
  const [value, setValue] = useState("");
  const [showNotice, setShowNotice] = useState(false);
  const noticeTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (noticeTimer.current !== null) {
        window.clearTimeout(noticeTimer.current);
      }
    };
  }, []);

  function handleSubmit() {
    // No real backend yet (see AGENTS.md). Show a polished inline notice
    // instead of calling out — auto-dismisses after 4.5s.
    setShowNotice(true);
    if (noticeTimer.current !== null) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setShowNotice(false), 4500);
  }

  function handleChipClick(seed: string) {
    setValue((prev) => (prev.trim().length === 0 ? seed : prev));
  }

  const hasText = value.trim().length > 0;

  return (
    <section aria-label="Describe your software project">
      <div className="ai-panel">
        <div className="ai-panel-head">
          <div className="ai-panel-head-left">
            <span className="ai-panel-head-dot" aria-hidden="true" />
            <span>Architecture brief</span>
          </div>
          <span className="ai-panel-head-tag">Preview</span>
        </div>

        <label htmlFor="ai-input" className="sr-only" style={{ display: "none" }}>
          Describe your software project
        </label>
        <textarea
          id="ai-input"
          className="ai-textarea"
          placeholder="Describe your software project — the problem you are solving, who it is for, and any constraints. Quantiliom will help you reason about architecture, stack decisions, modules, risks, and next steps."
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={6}
          spellCheck
        />

        <div className="ai-chips" role="group" aria-label="Example project types">
          {EXAMPLES.map((ex) => (
            <button
              type="button"
              key={ex.label}
              className="chip"
              onClick={() => handleChipClick(ex.seed)}
            >
              <span className="chip-glyph" aria-hidden="true">
                +
              </span>
              {ex.label}
            </button>
          ))}
        </div>

        <div className="ai-panel-foot">
          <div className="ai-foot-meta">
            <kbd>⌘</kbd>
            <kbd>↵</kbd>
            <span style={{ marginLeft: 6 }}>to analyze</span>
          </div>
          <button
            type="button"
            className="btn-primary"
            onClick={handleSubmit}
            disabled={!hasText}
            aria-disabled={!hasText}
          >
            <span>Start architecture analysis</span>
            <ArrowRightIcon size={14} className="btn-arrow" />
          </button>
        </div>
      </div>

      {showNotice ? (
        <div className="coming-soon-notice" role="status">
          <strong>Coming soon</strong>
          <span>
            AI generation is not wired up yet — your draft will run as soon as
            the analysis engine ships.
          </span>
        </div>
      ) : null}
    </section>
  );
}
