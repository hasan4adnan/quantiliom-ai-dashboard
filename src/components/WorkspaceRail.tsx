import { useState } from "react";

/**
 * Compact collapsible rail for the internal architecture workspace.
 *
 * Sits to the left of the workspace main panel, INSIDE the existing
 * dashboard shell (so the main Sidebar/Topbar stay visible). The rail
 * intentionally has no avatar, plan card, or branding so it doesn't
 * compete with the main Sidebar — it's a workspace navigator, not a
 * second product sidebar.
 *
 * Today the rail has exactly one active item (Architecture). The
 * Copilot item is a disabled placeholder for the chat panel that lands
 * in a later step. Future tabs (Diagram, Cost, Alternatives) can be
 * added to this list when they're implemented.
 */

export type RailItemKey = "architecture" | "copilot";

export type RailItem = {
  key: RailItemKey;
  label: string;
  hint?: string;
  disabled?: boolean;
};

const ITEMS: RailItem[] = [
  { key: "architecture", label: "Architecture" },
  {
    key: "copilot",
    label: "Copilot",
    hint: "Coming next",
    disabled: true,
  },
];

type Props = {
  activeKey: RailItemKey;
  onSelect: (key: RailItemKey) => void;
};

export default function WorkspaceRail({ activeKey, onSelect }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`workspace-rail${collapsed ? " workspace-rail--collapsed" : ""}`}
      aria-label="Workspace navigation"
    >
      <button
        type="button"
        className="workspace-rail-toggle"
        aria-label={collapsed ? "Expand workspace rail" : "Collapse workspace rail"}
        aria-pressed={collapsed}
        onClick={() => setCollapsed((c) => !c)}
      >
        <span className="workspace-rail-toggle-glyph" aria-hidden="true">
          {collapsed ? "›" : "‹"}
        </span>
        <span className="workspace-rail-toggle-label">Workspace</span>
      </button>

      <nav className="workspace-rail-nav">
        {ITEMS.map((item) => {
          const isActive = item.key === activeKey && !item.disabled;
          const className =
            "workspace-rail-item" +
            (isActive ? " workspace-rail-item--active" : "") +
            (item.disabled ? " workspace-rail-item--disabled" : "");
          return (
            <button
              key={item.key}
              type="button"
              className={className}
              aria-current={isActive ? "page" : undefined}
              aria-disabled={item.disabled ? "true" : undefined}
              disabled={item.disabled}
              onClick={() => {
                if (!item.disabled) onSelect(item.key);
              }}
              title={collapsed ? item.label : undefined}
            >
              <span className="workspace-rail-item-mark" aria-hidden="true">
                {item.label.charAt(0)}
              </span>
              <span className="workspace-rail-item-body">
                <span className="workspace-rail-item-label">{item.label}</span>
                {item.hint ? (
                  <span className="workspace-rail-item-hint">{item.hint}</span>
                ) : null}
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
