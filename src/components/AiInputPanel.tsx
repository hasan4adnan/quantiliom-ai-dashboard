import type { KeyboardEvent } from "react";
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

const MAX_DESCRIPTION_LENGTH = 2000;

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
};

/**
 * AiInputPanel — controlled project-brief input. The discovery flow
 * (loading → questions → review) is owned by DashboardHome; this component
 * only collects text and asks the parent to start a job.
 */
export default function AiInputPanel({
  value,
  onChange,
  onSubmit,
  disabled = false,
}: Props) {
  const hasText = value.trim().length > 0;
  const canSubmit = hasText && !disabled;

  function handleChipClick(seed: string) {
    if (disabled) return;
    onChange(value.trim().length === 0 ? seed : value);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      if (canSubmit) onSubmit();
    }
  }

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
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={6}
          spellCheck
          disabled={disabled}
          maxLength={MAX_DESCRIPTION_LENGTH + 64}
        />

        <div className="ai-chips" role="group" aria-label="Example project types">
          {EXAMPLES.map((ex) => (
            <button
              type="button"
              key={ex.label}
              className="chip"
              onClick={() => handleChipClick(ex.seed)}
              disabled={disabled}
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
            onClick={onSubmit}
            disabled={!canSubmit}
            aria-disabled={!canSubmit}
          >
            <span>Start architecture analysis</span>
            <ArrowRightIcon size={14} className="btn-arrow" />
          </button>
        </div>
      </div>
    </section>
  );
}
