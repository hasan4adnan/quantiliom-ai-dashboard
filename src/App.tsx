import { useCallback, useEffect, useState } from "react";
import AuthGate from "./components/AuthGate";
import PageTransition from "./components/PageTransition";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import DashboardHome from "./pages/DashboardHome";
import ProjectsPage from "./pages/ProjectsPage";
import SubscriptionPage from "./pages/SubscriptionPage";
import UpgradePage from "./pages/UpgradePage";
import AccountPage from "./pages/AccountPage";
import SettingsPage from "./pages/SettingsPage";
import TermsPage from "./pages/TermsPage";
import PrivacyPage from "./pages/PrivacyPage";
import ArchitectureWorkspace, {
  type WorkspaceState,
} from "./pages/ArchitectureWorkspace";
import OnboardingFlow, {
  type OnboardingSeed,
} from "./pages/OnboardingFlow";
import { useRoute, type Route } from "./lib/router";
import type { LocalUser } from "./lib/api";
import { auth, signOut, type User } from "./lib/firebase";
import { bootstrapSettings } from "./lib/settings";

// Apply the user's saved appearance (theme/accent/font scale) at module
// load so we don't flash the defaults before React mounts.
bootstrapSettings();

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
// Onboarding and the architecture workspace are sub-flows of Home, so
// keep Home highlighted while the user is inside either of them.
const SIDEBAR_ACTIVE: Partial<Record<Route, Route>> = {
  upgrade: "subscription",
  onboarding: "home",
  workspace: "home",
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
  onStartOnboarding: (description: string) => void;
}) {
  const {
    route,
    param,
    navigate,
    email,
    fbUser,
    localUser,
    onSignOut,
    onStartOnboarding,
  } = args;
  if (route === "home") {
    return (
      <DashboardHome
        firstName={firstNameFrom(deriveDisplayName(fbUser, localUser))}
        onStartOnboarding={onStartOnboarding}
      />
    );
  }
  // NOTE: `onboarding` and `workspace` are NOT handled here. They render
  // as full-screen standalone surfaces above the dashboard shell — see
  // the early returns in `Shell` below. Including them here would put
  // the Sidebar/Topbar around them, which is exactly what we don't want.
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
  if (route === "settings") return <SettingsPage onNavigate={navigate} />;
  return <ComingSoonPage route={route} onBack={() => navigate("home")} />;
}

function Shell({ fbUser, localUser }: { fbUser: User; localUser: LocalUser }) {
  const [navOpen, setNavOpen] = useState(false);
  const { route, param, navigate } = useRoute();
  // Workspace state is intentionally in-memory only: a refresh clears
  // it and ArchitectureWorkspace falls back to the empty card. We do
  // NOT persist this (no localStorage/sessionStorage, no URL params) so
  // a stale or tampered architecture payload can't survive a reload.
  const [workspaceState, setWorkspaceState] = useState<WorkspaceState | null>(
    null
  );
  // Onboarding seed is the brief the user typed on Home. Same
  // in-memory-only policy as workspaceState: refresh clears it, the
  // onboarding screen shows an empty state with a back-to-Home button.
  const [onboardingSeed, setOnboardingSeed] = useState<OnboardingSeed | null>(
    null
  );

  const openArchitectureWorkspace = useCallback(
    (state: WorkspaceState) => {
      setWorkspaceState(state);
      navigate("workspace");
    },
    [navigate]
  );

  const startOnboarding = useCallback(
    (description: string) => {
      setOnboardingSeed({
        description,
        openedAt: new Date().toISOString(),
      });
      navigate("onboarding");
    },
    [navigate]
  );

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

  // Standalone full-viewport surfaces — these bypass the dashboard
  // shell entirely so the user sees a dedicated AI Discovery / Workspace
  // experience instead of nested chrome (main Sidebar + main Topbar +
  // workspace rail). Auth is still enforced because we are inside
  // <AuthGate> in PublicRouter.
  if (route === "onboarding") {
    return (
      <PageTransition pageKey="onboarding">
        <OnboardingFlow
          seed={onboardingSeed}
          getIdToken={() => fbUser.getIdToken()}
          onBackHome={() => navigate("home")}
          onOpenArchitectureWorkspace={openArchitectureWorkspace}
        />
      </PageTransition>
    );
  }
  if (route === "workspace") {
    return (
      <PageTransition pageKey="workspace">
        <ArchitectureWorkspace
          state={workspaceState}
          onBackToHome={() => navigate("home")}
        />
      </PageTransition>
    );
  }

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
            username: localUser.username,
          }}
          route={route}
          onMenuClick={() => setNavOpen(true)}
          onNavigate={navigate}
          onSignOut={handleSignOut}
        />
        <div className="app-scroll">
          <div className="app-scroll-inner">
            <PageTransition pageKey={`${route}:${param ?? ""}`}>
              {renderPage({
                route,
                param,
                navigate,
                email,
                fbUser,
                localUser,
                onSignOut: handleSignOut,
                onStartOnboarding: startOnboarding,
              })}
            </PageTransition>
          </div>
        </div>
      </main>
    </div>
  );
}

// Top-level switch. Legal pages render outside AuthGate so they are
// reachable both before sign-in (from the LoginScreen footer links) and
// after, without needing to spin up the dashboard shell or hit the
// backend /api/auth/verify endpoint.
function PublicRouter() {
  const { route } = useRoute();
  if (route === "terms") return <TermsPage />;
  if (route === "privacy") return <PrivacyPage />;
  return (
    <AuthGate>
      {(fbUser, localUser) => <Shell fbUser={fbUser} localUser={localUser} />}
    </AuthGate>
  );
}

export default function App() {
  return <PublicRouter />;
}
