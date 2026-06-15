import { useEffect, useState } from "react";
import AuthGate from "./components/AuthGate";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import DashboardHome from "./pages/DashboardHome";
import ProjectsPage from "./pages/ProjectsPage";
import SubscriptionPage from "./pages/SubscriptionPage";
import UpgradePage from "./pages/UpgradePage";
import AccountPage from "./pages/AccountPage";
import { useRoute, type Route } from "./lib/router";
import type { LocalUser } from "./lib/api";
import { auth, signOut, type User } from "./lib/firebase";

function planLabel(plan: string): string {
  if (!plan) return "Free Plan";
  if (plan === "free") return "Free Plan";
  if (plan === "interested_pro") return "Pro (interest)";
  if (plan === "team_evaluation") return "Team (evaluating)";
  return `${plan.charAt(0).toUpperCase()}${plan.slice(1)} Plan`;
}

function deriveDisplayName(fbUser: User, localUser: LocalUser): string {
  if (localUser.name && localUser.name.trim()) return localUser.name.trim();
  if (fbUser.displayName && fbUser.displayName.trim()) return fbUser.displayName.trim();
  const email = localUser.email || fbUser.email || "";
  if (email) {
    const local = email.split("@")[0];
    if (local) return local;
  }
  return "Quantiliom User";
}

const COMING_SOON_COPY: Partial<Record<Route, { title: string; sub: string }>> = {
  new: {
    title: "Start a new architecture brief.",
    sub: "Go to Home and use the AI input panel to sketch one — full project workspaces ship next.",
  },
  documents: {
    title: "Generated documents will live here.",
    sub: "PDF exports, README outlines, and stack-decision docs land with the Pro plan.",
  },
  templates: {
    title: "Architecture templates are on the way.",
    sub: "Curated starting points for SaaS, marketplaces, mobile apps, and AI tools.",
  },
};

function ComingSoonPage({ route, onBack }: { route: Route; onBack: () => void }) {
  const copy =
    COMING_SOON_COPY[route] ?? {
      title: "Coming soon.",
      sub: "This screen is not built yet.",
    };
  return (
    <div className="page-enter">
      <section className="hero" aria-label="Coming soon">
        <span className="eyebrow">Preview</span>
        <h1 className="hero-title">{copy.title}</h1>
        <p className="hero-sub">{copy.sub}</p>
      </section>
      <button type="button" className="btn-solid-dark" onClick={onBack}>
        Back to Home
        <span aria-hidden="true">→</span>
      </button>
    </div>
  );
}

// Routes that should keep a different sidebar item active (e.g. /#upgrade
// is a sub-flow of Subscription, not its own top-level destination).
const SIDEBAR_ACTIVE: Partial<Record<Route, Route>> = {
  upgrade: "subscription",
};

function firstNameFrom(displayName: string): string {
  const trimmed = displayName.trim();
  if (!trimmed) return "there";
  const first = trimmed.split(/\s+/)[0];
  // If we fell back to the email local-part, drop common dot/underscore
  // separators so "hasan.kemal" becomes "Hasan" not the whole local-part.
  const cleaned = first.split(/[._-]/)[0];
  if (!cleaned) return "there";
  // Title-case the first letter without touching the rest (so "HASAN"
  // stays "HASAN" but "hasan" becomes "Hasan").
  if (cleaned[0] === cleaned[0].toUpperCase()) return cleaned;
  return cleaned[0].toUpperCase() + cleaned.slice(1);
}

function renderPage(args: {
  route: Route;
  param: string | null;
  navigate: (r: Route, p?: string) => void;
  email: string;
  fbUser: User;
  localUser: LocalUser;
  onSignOut: () => void;
}) {
  const { route, param, navigate, email, fbUser, localUser, onSignOut } = args;
  if (route === "home") {
    return (
      <DashboardHome firstName={firstNameFrom(deriveDisplayName(fbUser, localUser))} />
    );
  }
  if (route === "projects") return <ProjectsPage onNavigate={navigate} />;
  if (route === "subscription") return <SubscriptionPage onNavigate={navigate} />;
  if (route === "upgrade") {
    const planKey = param === "team" ? "team" : "pro";
    return (
      <UpgradePage planKey={planKey} prefilledEmail={email} onNavigate={navigate} />
    );
  }
  if (route === "account") {
    return (
      <AccountPage
        fbUser={fbUser}
        localUser={localUser}
        onNavigate={navigate}
        onSignOut={onSignOut}
      />
    );
  }
  return <ComingSoonPage route={route} onBack={() => navigate("home")} />;
}

function Shell({ fbUser, localUser }: { fbUser: User; localUser: LocalUser }) {
  const [navOpen, setNavOpen] = useState(false);
  const { route, param, navigate } = useRoute();

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 901px)");
    const handler = (e: MediaQueryListEvent) => {
      if (e.matches) setNavOpen(false);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (!navOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setNavOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navOpen]);

  async function handleSignOut() {
    try {
      if (auth) await signOut(auth);
    } catch (err) {
      console.warn("[dashboard] sign-out failed:", err);
    }
  }

  const email = localUser.email || fbUser.email || "";
  const sidebarActive = SIDEBAR_ACTIVE[route] ?? route;

  return (
    <div className="app-shell">
      <Sidebar
        isOpen={navOpen}
        onClose={() => setNavOpen(false)}
        activeKey={sidebarActive}
        onNavigate={navigate}
      />
      <div
        className={`sidebar-scrim${navOpen ? " is-visible" : ""}`}
        onClick={() => setNavOpen(false)}
        aria-hidden="true"
      />
      <main className="app-main">
        <Topbar
          user={{
            name: deriveDisplayName(fbUser, localUser),
            email,
            plan: planLabel(localUser.plan),
          }}
          route={route}
          onMenuClick={() => setNavOpen(true)}
          onNavigate={navigate}
          onSignOut={handleSignOut}
        />
        <div className="app-scroll">
          <div className="app-scroll-inner" key={`${route}:${param ?? ""}`}>
            {renderPage({
              route,
              param,
              navigate,
              email,
              fbUser,
              localUser,
              onSignOut: handleSignOut,
            })}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthGate>
      {(fbUser, localUser) => <Shell fbUser={fbUser} localUser={localUser} />}
    </AuthGate>
  );
}
