import type { ComponentType, SVGProps } from "react";
import type { Route } from "../lib/router";
import {
  HomeIcon,
  SparkIcon,
  FolderIcon,
  DocIcon,
  TemplateIcon,
  UserIcon,
  CreditCardIcon,
} from "./icons";

type NavKey = Route;

type Item = {
  key: NavKey;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;
  badge?: string;
};

const PRIMARY: Item[] = [
  { key: "home", label: "Home", icon: HomeIcon },
  { key: "new", label: "New Architecture", icon: SparkIcon, badge: "AI" },
  { key: "projects", label: "Projects", icon: FolderIcon },
  { key: "documents", label: "Documents", icon: DocIcon },
  { key: "templates", label: "Templates", icon: TemplateIcon },
];

const SECONDARY: Item[] = [
  { key: "subscription", label: "Subscription", icon: CreditCardIcon },
  { key: "account", label: "Account", icon: UserIcon },
];

type Props = {
  activeKey: Route;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (r: Route) => void;
};

export default function Sidebar({ activeKey, isOpen, onClose, onNavigate }: Props) {
  function handleItem(r: Route) {
    onClose();
    onNavigate(r);
  }

  return (
    <aside className={`sidebar${isOpen ? " is-open" : ""}`} aria-label="Primary">
      <div className="sidebar-brand">
        <div className="sidebar-brand-mark" aria-hidden="true">
          Q
        </div>
        <div>
          <div className="sidebar-brand-name">Quantiliom AI</div>
          <span className="sidebar-brand-sub">Architect Workspace</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-nav-label">Workspace</div>
        {PRIMARY.map((item) => (
          <NavItem
            key={item.key}
            item={item}
            isActive={item.key === activeKey}
            onClick={() => handleItem(item.key)}
          />
        ))}

        <div className="sidebar-nav-label" style={{ marginTop: "auto" }}>
          Account
        </div>
        {SECONDARY.map((item) => (
          <NavItem
            key={item.key}
            item={item}
            isActive={item.key === activeKey}
            onClick={() => handleItem(item.key)}
          />
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="plan-card">
          <div className="plan-card-head">
            <div>
              <div className="plan-card-tag">Current plan</div>
              <div className="plan-card-name">Free</div>
            </div>
            <span className="plan-card-dot" aria-hidden="true" />
          </div>
          <p className="plan-card-body">
            Upgrade to Pro for unlimited architectures, exports, and revision
            history.
          </p>
          <button
            type="button"
            className="plan-card-cta"
            onClick={() => handleItem("subscription")}
          >
            Upgrade
          </button>
        </div>
      </div>
    </aside>
  );
}

function NavItem({
  item,
  isActive,
  onClick,
}: {
  item: Item;
  isActive: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      className={`nav-item${isActive ? " is-active" : ""}`}
      aria-current={isActive ? "page" : undefined}
      onClick={onClick}
    >
      <Icon className="nav-icon" />
      <span>{item.label}</span>
      {item.badge ? <span className="nav-badge">{item.badge}</span> : null}
    </button>
  );
}
