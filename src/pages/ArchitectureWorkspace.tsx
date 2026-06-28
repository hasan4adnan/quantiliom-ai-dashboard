import { useEffect, useState } from "react";
import AlternativesBoard from "../components/AlternativesBoard";
import ArchitectureBoard from "../components/ArchitectureBoard";
import BacklogBoard from "../components/BacklogBoard";
import CostEstimateBoard from "../components/CostEstimateBoard";
import RequirementsBoard from "../components/RequirementsBoard";
import RoadmapBoard from "../components/RoadmapBoard";
import TechStackBoard from "../components/TechStackBoard";
import WorkspaceChatPanel from "../components/WorkspaceChatPanel";
import WorkspaceRail, { type RailItemKey } from "../components/WorkspaceRail";

/**
 * Workspace shape carried in-memory from OnboardingFlow → App.Shell →
 * here. The architecture payload is intentionally `unknown` because the
 * backend engine owns the schema; the board narrows it safely. No
 * persistence: a hard refresh clears workspaceState and we fall back
 * to the empty card below.
 */
export type WorkspaceState = {
  architecture: unknown;
  brief: string | null;
  requirements?: unknown;
  discoveryJobId?: string | null;
  requirementsJobId?: string | null;
  architectureJobId?: string | null;
  openedAt: string;
};

type Props = {
  state: WorkspaceState | null;
  onBackToHome: () => void;
};

/**
 * The architecture workspace is a STANDALONE full-viewport surface
 * rendered ABOVE the dashboard shell — the main Sidebar and Topbar are
 * not present here.
 *
 * Step 9o layout changes:
 *   - The body is now a two-column grid (rail | main). Copilot no
 *     longer reserves a right column; it opens from a small "Copilot"
 *     toggle in the standalone header into a fixed drawer that
 *     overlays the right edge, so the centre column always gets the
 *     full available width.
 *   - The rail switches between two internal sections: Architecture
 *     (diagram canvas) and Tech Stack (grouped technology cards).
 */
export default function ArchitectureWorkspace({ state, onBackToHome }: Props) {
  const [activeSection, setActiveSection] = useState<RailItemKey>("architecture");
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);

  // Escape closes the drawer — standard dialog convention. Only wired
  // when the drawer is open so we don't keep a listener around forever.
  useEffect(() => {
    if (!isCopilotOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsCopilotOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isCopilotOpen]);

  return (
    <div className="workspace-standalone" aria-label="Architecture workspace">
      <header className="workspace-standalone-header">
        <div className="workspace-standalone-brand">
          <span className="workspace-standalone-brand-mark" aria-hidden="true">
            Q
          </span>
          <div className="workspace-standalone-brand-text">
            <span className="workspace-standalone-brand-name">
              Quantiliom AI
            </span>
            <span className="workspace-standalone-brand-sub">
              Architecture Workspace
            </span>
          </div>
        </div>
        <div className="workspace-standalone-actions">
          {state ? (
            <button
              type="button"
              className={`workspace-copilot-toggle${
                isCopilotOpen ? " is-open" : ""
              }`}
              aria-expanded={isCopilotOpen}
              aria-controls="workspace-copilot-drawer"
              onClick={() => setIsCopilotOpen((v) => !v)}
            >
              <span
                className="workspace-copilot-toggle-dot"
                aria-hidden="true"
              />
              Copilot
            </button>
          ) : null}
          <button
            type="button"
            className="wiz-btn wiz-btn-ghost"
            onClick={onBackToHome}
          >
            ← Back to dashboard
          </button>
        </div>
      </header>

      {!state ? (
        <main className="workspace-standalone-body workspace-standalone-body--empty">
          <section
            className="workspace-empty"
            aria-label="No architecture loaded"
          >
            <div className="discovery-flow-eyebrow">
              <span className="discovery-flow-eyebrow-dot" aria-hidden="true" />
              Workspace
            </div>
            <h2 className="discovery-flow-title">
              No architecture loaded yet
            </h2>
            <p className="discovery-flow-sub">
              Start from Home to generate an architecture first. The
              workspace opens automatically once your architecture job
              succeeds.
            </p>
            <div className="discovery-flow-foot">
              <button
                type="button"
                className="wiz-btn wiz-btn-dark"
                onClick={onBackToHome}
              >
                Back to Home →
              </button>
            </div>
          </section>
        </main>
      ) : (
        <div className="workspace-standalone-body">
          <WorkspaceRail activeKey={activeSection} onSelect={setActiveSection} />
          <main className="workspace-standalone-main">
            {activeSection === "architecture" ? (
              <ArchitectureBoard
                architecture={state.architecture}
                brief={state.brief}
              />
            ) : activeSection === "requirements" ? (
              <RequirementsBoard requirements={state.requirements} />
            ) : activeSection === "tech-stack" ? (
              <TechStackBoard architecture={state.architecture} />
            ) : activeSection === "cost-estimate" ? (
              <CostEstimateBoard architecture={state.architecture} />
            ) : activeSection === "alternatives" ? (
              <AlternativesBoard architecture={state.architecture} />
            ) : activeSection === "roadmap" ? (
              <RoadmapBoard
                architecture={state.architecture}
                requirements={state.requirements}
              />
            ) : (
              <BacklogBoard
                architecture={state.architecture}
                requirements={state.requirements}
              />
            )}
          </main>
        </div>
      )}

      {isCopilotOpen ? (
        <>
          <div
            className="workspace-copilot-backdrop"
            aria-hidden="true"
            onClick={() => setIsCopilotOpen(false)}
          />
          <aside
            id="workspace-copilot-drawer"
            className="workspace-copilot-drawer"
            role="dialog"
            aria-modal="false"
            aria-label="Architecture Copilot"
          >
            <header className="workspace-copilot-drawer-head">
              <span className="workspace-copilot-drawer-title">Copilot</span>
              <button
                type="button"
                className="workspace-copilot-drawer-close"
                aria-label="Close copilot"
                onClick={() => setIsCopilotOpen(false)}
              >
                ×
              </button>
            </header>
            <div className="workspace-copilot-drawer-body">
              <WorkspaceChatPanel />
            </div>
          </aside>
        </>
      ) : null}
    </div>
  );
}
