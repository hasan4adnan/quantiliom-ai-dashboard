import { useEffect, useRef, useState } from "react";
import type { Route } from "../lib/router";
import { BellIcon, ChevronDownIcon, MenuIcon } from "./icons";

type Props = {
  user: { name: string; email: string; plan: string; username: string | null };
  route: Route;
  onMenuClick: () => void;
  onNavigate: (r: Route) => void;
  onSignOut: () => void;
};

const ROUTE_LABEL: Record<Route, string> = {
  home: "Home",
  new: "New Architecture",
  projects: "Projects",
  documents: "Documents",
  templates: "Templates",
  subscription: "Subscription",
  upgrade: "Upgrade",
  account: "Account",
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase() || "Q";
}

export default function Topbar({
  user,
  route,
  onMenuClick,
  onNavigate,
  onSignOut,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <header className="topbar" role="banner">
      <div className="topbar-left">
        <button
          type="button"
          className="topbar-menu-btn"
          onClick={onMenuClick}
          aria-label="Open navigation"
        >
          <MenuIcon size={18} />
        </button>
        <div className="topbar-crumbs" aria-label="Breadcrumb">
          <span>Workspace</span>
          <span className="sep">/</span>
          <span className="here">{ROUTE_LABEL[route]}</span>
        </div>
      </div>

      <div className="topbar-right">
        <button type="button" className="icon-btn" aria-label="Notifications">
          <BellIcon size={18} />
          <span className="badge-dot" aria-hidden="true" />
        </button>

        <div className="account-wrap" ref={menuRef}>
          <button
            type="button"
            className="account-pill"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span className="account-avatar" aria-hidden="true">
              {initials(user.name)}
            </span>
            <span className="account-text">
              <span className="account-name">{user.name}</span>
              <span className="account-plan">{user.plan}</span>
            </span>
            <ChevronDownIcon size={14} className="account-chev" />
          </button>

          {menuOpen ? (
            <div className="account-menu" role="menu">
              <div className="account-menu-head">
                <div className="account-menu-name">{user.name}</div>
                {user.username ? (
                  <div className="account-menu-username">{user.username}</div>
                ) : null}
                {user.email ? (
                  <div className="account-menu-email">{user.email}</div>
                ) : null}
              </div>
              <div className="account-menu-sep" />
              <button
                type="button"
                role="menuitem"
                className="account-menu-item"
                onClick={() => {
                  setMenuOpen(false);
                  onNavigate("subscription");
                }}
              >
                Subscription
              </button>
              <button
                type="button"
                role="menuitem"
                className="account-menu-item"
                onClick={() => {
                  setMenuOpen(false);
                  onNavigate("account");
                }}
              >
                Account
              </button>
              <div className="account-menu-sep" />
              <button
                type="button"
                role="menuitem"
                className="account-menu-item"
                onClick={() => {
                  setMenuOpen(false);
                  onSignOut();
                }}
              >
                Sign out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
