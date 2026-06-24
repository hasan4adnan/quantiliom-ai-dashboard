import { useState } from "react";
import ArchitectureBoard from "../components/ArchitectureBoard";
import WorkspaceChatPanel from "../components/WorkspaceChatPanel";
import WorkspaceRail, { type RailItemKey } from "../components/WorkspaceRail";

/**
 * Workspace shape carried in-memory from DashboardHome → App.Shell →
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

export default function ArchitectureWorkspace({ state, onBackToHome }: Props) {
  const [activeTab, setActiveTab] = useState<RailItemKey>("architecture");

  if (!state) {
    return (
      <section className="workspace-empty" aria-label="No architecture loaded">
        <div className="discovery-flow-eyebrow">
          <span className="discovery-flow-eyebrow-dot" aria-hidden="true" />
          Workspace
        </div>
        <h2 className="discovery-flow-title">No architecture loaded yet</h2>
        <p className="discovery-flow-sub">
          Start from Home to generate an architecture first. The workspace
          opens automatically once your architecture job succeeds.
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
    );
  }

  return (
    <section className="workspace-shell" aria-label="Architecture workspace">
      <WorkspaceRail activeKey={activeTab} onSelect={setActiveTab} />
      <div className="workspace-main">
        <ArchitectureBoard
          architecture={state.architecture}
          brief={state.brief}
        />
      </div>
      <WorkspaceChatPanel />
    </section>
  );
}
