import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
  type SVGProps,
} from "react";
import AiInputPanel from "../components/AiInputPanel";
import DiscoveryLoadingPanel from "../components/DiscoveryLoadingPanel";
import DiscoveryQuestionnaire from "../components/DiscoveryQuestionnaire";
import {
  ArrowRightIcon,
  GaugeIcon,
  PhoneIcon,
  ServerIcon,
  SparkIcon,
  StoreIcon,
} from "../components/icons";
import {
  createAiDiscoveryJob,
  getAiDiscoveryJob,
  type AiQuestion,
  type RequirementAnalysis,
} from "../lib/api";

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 60;
const MAX_DESCRIPTION_LENGTH = 2000;

type Phase =
  | { kind: "brief" }
  | { kind: "loading"; description: string; jobId: string | null }
  | {
      kind: "questions";
      description: string;
      jobId: string;
      analysis: RequirementAnalysis | null;
      questions: AiQuestion[];
    }
  | { kind: "error"; description: string; message: string };

type Props = {
  firstName: string;
  /**
   * Resolves a fresh Firebase ID token from the authenticated session.
   * Provided by App.tsx via the AuthGate `fbUser`. The discovery flow is
   * token-gated and must never store the token locally.
   */
  getIdToken: () => Promise<string>;
};

function safeErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) {
    const m = err.message;
    return m.length > 240 ? `${m.slice(0, 240)}…` : m;
  }
  return fallback;
}

export default function DashboardHome({ firstName, getIdToken }: Props) {
  const greeting = useMemo(() => greetingFor(new Date()), []);
  const [brief, setBrief] = useState("");
  const [phase, setPhase] = useState<Phase>({ kind: "brief" });

  const cancelledRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const attemptRef = useRef(0);

  useEffect(() => {
    cancelledRef.current = false;
    return () => {
      cancelledRef.current = true;
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  const stopPolling = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    attemptRef.current = 0;
  }, []);

  const handleReset = useCallback(() => {
    stopPolling();
    if (!cancelledRef.current) setPhase({ kind: "brief" });
  }, [stopPolling]);

  const pollOnce = useCallback(
    async (description: string, jobId: string) => {
      if (cancelledRef.current) return;
      try {
        const idToken = await getIdToken();
        const res = await getAiDiscoveryJob(idToken, jobId);
        if (cancelledRef.current) return;

        const job = res.job;
        if (job.status === "succeeded") {
          const questions = Array.isArray(job.questions) ? job.questions : [];
          setPhase({
            kind: "questions",
            description,
            jobId,
            analysis: job.analysis ?? null,
            questions,
          });
          stopPolling();
          return;
        }
        if (job.status === "failed") {
          setPhase({
            kind: "error",
            description,
            message:
              "We couldn't generate questions for that description. Edit the brief and try again.",
          });
          stopPolling();
          return;
        }

        attemptRef.current += 1;
        if (attemptRef.current >= MAX_POLL_ATTEMPTS) {
          setPhase({
            kind: "error",
            description,
            message:
              "Generating questions is taking longer than expected. Try again in a moment.",
          });
          stopPolling();
          return;
        }

        timerRef.current = window.setTimeout(() => {
          void pollOnce(description, jobId);
        }, POLL_INTERVAL_MS);
      } catch (err) {
        if (cancelledRef.current) return;
        setPhase({
          kind: "error",
          description,
          message: safeErrorMessage(
            err,
            "We couldn't reach the discovery service. Try again."
          ),
        });
        stopPolling();
      }
    },
    [getIdToken, stopPolling]
  );

  const startDiscovery = useCallback(
    async (description: string) => {
      stopPolling();
      setPhase({ kind: "loading", description, jobId: null });
      try {
        const idToken = await getIdToken();
        const res = await createAiDiscoveryJob(idToken, { description });
        if (cancelledRef.current) return;

        attemptRef.current = 0;
        setPhase({ kind: "loading", description, jobId: res.job.id });
        timerRef.current = window.setTimeout(() => {
          void pollOnce(description, res.job.id);
        }, POLL_INTERVAL_MS);
      } catch (err) {
        if (cancelledRef.current) return;
        setPhase({
          kind: "error",
          description,
          message: safeErrorMessage(
            err,
            "We couldn't start the discovery service. Try again."
          ),
        });
      }
    },
    [getIdToken, pollOnce, stopPolling]
  );

  const handleSubmit = useCallback(() => {
    const description = brief.trim();
    if (!description) return;
    if (description.length > MAX_DESCRIPTION_LENGTH) {
      setPhase({
        kind: "error",
        description,
        message: `Please keep your description under ${MAX_DESCRIPTION_LENGTH} characters.`,
      });
      return;
    }
    void startDiscovery(description);
  }, [brief, startDiscovery]);

  const handleRetry = useCallback(() => {
    if (phase.kind !== "error") return;
    void startDiscovery(phase.description);
  }, [phase, startDiscovery]);

  if (phase.kind === "loading") {
    return (
      <DiscoveryFlowFrame>
        <DiscoveryLoadingPanel
          description={phase.description}
          onCancel={handleReset}
        />
      </DiscoveryFlowFrame>
    );
  }
  if (phase.kind === "questions") {
    return (
      <DiscoveryFlowFrame>
        <DiscoveryQuestionnaire
          analysis={phase.analysis}
          questions={phase.questions}
          onReset={handleReset}
        />
      </DiscoveryFlowFrame>
    );
  }
  if (phase.kind === "error") {
    return (
      <DiscoveryFlowFrame>
        <ErrorPanel
          message={phase.message}
          onRetry={handleRetry}
          onReset={handleReset}
        />
      </DiscoveryFlowFrame>
    );
  }

  return (
    <>
      <Hero firstName={firstName} greeting={greeting} />

      <section className="home-block">
        <AiInputPanel
          value={brief}
          onChange={setBrief}
          onSubmit={handleSubmit}
        />
      </section>

      <RecentActivity />
      <Templates />

      <p className="home-foot-note">
        Workspace preview — recent activity and projects shown here are sample
        state until project persistence ships. Your real briefs will appear in
        their place once the backend lands.
      </p>
    </>
  );
}

function DiscoveryFlowFrame({ children }: { children: ReactNode }) {
  return <section className="discovery-flow">{children}</section>;
}

function ErrorPanel({
  message,
  onRetry,
  onReset,
}: {
  message: string;
  onRetry: () => void;
  onReset: () => void;
}) {
  return (
    <div className="discovery-error-card" role="alert">
      <div className="discovery-flow-eyebrow">
        <span className="discovery-flow-eyebrow-dot" aria-hidden="true" />
        Discovery
      </div>
      <h2 className="discovery-flow-title">
        We couldn&rsquo;t finish discovery
      </h2>
      <p className="discovery-flow-sub">{message}</p>
      <div className="discovery-flow-foot discovery-flow-foot-split">
        <button
          type="button"
          className="wiz-btn wiz-btn-ghost"
          onClick={onReset}
        >
          Start over
        </button>
        <button
          type="button"
          className="wiz-btn wiz-btn-dark"
          onClick={onRetry}
        >
          Try again →
        </button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
 * Hero — quiet, confident, no glow, no date
 * ════════════════════════════════════════════════════════════════════════ */
function greetingFor(d: Date): string {
  const h = d.getHours();
  if (h < 5) return "Good evening";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function Hero({ firstName, greeting }: { firstName: string; greeting: string }) {
  return (
    <section className="home-hero">
      <h1 className="home-hero-title">
        {greeting}, {firstName}.
      </h1>
      <p className="home-hero-sub">
        Your architecture workspace is ready. 7 projects active, 2 awaiting
        review. Open the brief below to continue.
      </p>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════
 * Meta rule — the website's signature section divider
 *   ──────────────────────  LABEL                          [RIGHT ITEM]
 * ════════════════════════════════════════════════════════════════════════ */
function MetaRule({
  label,
  rightLabel,
  rightHref,
}: {
  label: string;
  rightLabel?: string;
  rightHref?: string;
}) {
  return (
    <div className="meta-rule">
      <span className="meta-rule-line" aria-hidden="true" />
      <span className="meta-rule-text">{label}</span>
      {rightLabel ? (
        <a className="meta-rule-link" href={rightHref ?? "#"}>
          {rightLabel}
          <ArrowRightIcon size={11} />
        </a>
      ) : null}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
 * Recent activity — flat list with hairline dividers, no colored chrome
 * ════════════════════════════════════════════════════════════════════════ */
type ActivityRow = {
  title: string;
  subject: string;
  time: string;
};

const ACTIVITY: ActivityRow[] = [
  {
    title: "Created architecture brief",
    subject: "Telemetry pipeline for fleet ops",
    time: "2h ago",
  },
  {
    title: "Updated architecture",
    subject: "Multi-tenant analytics SaaS",
    time: "Yesterday",
  },
  {
    title: "Exported PDF documentation",
    subject: "Mobile habit tracker — offline sync",
    time: "3 days ago",
  },
  {
    title: "Added a teammate",
    subject: "kemal@quantiliom.ai",
    time: "1 week ago",
  },
];

function RecentActivity() {
  return (
    <section className="home-block">
      <MetaRule label="Recent activity" rightLabel="View all" rightHref="#projects" />
      <ul className="recent-list">
        {ACTIVITY.map((a, i) => (
          <li key={i} className="recent-row">
            <span className="recent-index">{String(i + 1).padStart(2, "0")}</span>
            <div className="recent-body">
              <span className="recent-title">{a.title}</span>
              <span className="recent-subject">{a.subject}</span>
            </div>
            <span className="recent-time">{a.time}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════
 * Templates — clean white cards, subtle border, hover darkens border
 * ════════════════════════════════════════════════════════════════════════ */
type ThemeKey = "web" | "mobile" | "ai" | "commerce" | "internal";

type Template = {
  key: string;
  theme: ThemeKey;
  category: string;
  name: string;
  summary: string;
  icon: ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;
};

const TEMPLATES: Template[] = [
  {
    key: "saas",
    theme: "web",
    category: "Web",
    name: "SaaS MVP",
    summary:
      "Multi-tenant web app with auth, billing, and analytics. Production-ready in two weeks.",
    icon: ServerIcon,
  },
  {
    key: "mobile",
    theme: "mobile",
    category: "Mobile",
    name: "Mobile app",
    summary:
      "iOS + Android with offline-first sync, weekly insight reports, and push notifications.",
    icon: PhoneIcon,
  },
  {
    key: "ai",
    theme: "ai",
    category: "AI",
    name: "AI tool",
    summary:
      "LLM orchestration, retrieval-augmented generation, and a workspace for prompt evaluation.",
    icon: SparkIcon,
  },
  {
    key: "marketplace",
    theme: "commerce",
    category: "Commerce",
    name: "Marketplace",
    summary:
      "Two-sided market with escrow, ratings, dispute resolution, and split shipping.",
    icon: StoreIcon,
  },
  {
    key: "dashboard",
    theme: "internal",
    category: "Internal",
    name: "Internal dashboard",
    summary:
      "Ops dashboard with real-time data, role-based access, and exportable reports.",
    icon: GaugeIcon,
  },
];

function Templates() {
  return (
    <section className="home-block">
      <MetaRule label="Templates" rightLabel="Browse all" rightHref="#templates" />
      <div className="tmpl-grid">
        {TEMPLATES.map((t) => (
          <TemplateCard key={t.key} template={t} />
        ))}
      </div>
    </section>
  );
}

function TemplateCard({ template }: { template: Template }) {
  const Icon = template.icon;
  return (
    <button type="button" className={`tmpl-card tmpl-${template.theme}`}>
      <span className="tmpl-glow" aria-hidden="true" />
      <span className="tmpl-icon" aria-hidden="true">
        <Icon size={18} />
      </span>
      <span className="tmpl-category">{template.category}</span>
      <span className="tmpl-name">{template.name}</span>
      <span className="tmpl-summary">{template.summary}</span>
      <span className="tmpl-link">
        Use template
        <ArrowRightIcon size={11} />
      </span>
    </button>
  );
}
