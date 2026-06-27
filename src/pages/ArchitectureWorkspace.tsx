import { useState } from "react";
import ArchitectureBoard from "../components/ArchitectureBoard";
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
 * not present here. It carries its own minimal brand header + back-to-
 * dashboard action and dedicates the rest of the viewport to the
 * Architecture board (with a workspace rail on the left and an optional
 * Copilot placeholder on the right). On narrower screens the Copilot
 * column collapses below the board so the board itself stays the
 * largest, most readable surface.
 */
export default function ArchitectureWorkspace({ state, onBackToHome }: Props) {
  const [activeTab, setActiveTab] = useState<RailItemKey>("architecture");

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
        <button
          type="button"
          className="wiz-btn wiz-btn-ghost"
          onClick={onBackToHome}
        >
          ← Back to dashboard
        </button>
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
          <WorkspaceRail activeKey={activeTab} onSelect={setActiveTab} />
          <main className="workspace-standalone-main">
            <ArchitectureBoard
              architecture={state.architecture}
              brief={state.brief}
            />
          </main>
          <WorkspaceChatPanel />
        </div>
      )}
    </div>
  );
}
