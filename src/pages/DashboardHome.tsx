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
import ArchitectureLoadingPanel from "../components/ArchitectureLoadingPanel";
import ArchitecturePreview from "../components/ArchitecturePreview";
import DiscoveryLoadingPanel from "../components/DiscoveryLoadingPanel";
import DiscoveryQuestionnaire from "../components/DiscoveryQuestionnaire";
import RequirementsLoadingPanel from "../components/RequirementsLoadingPanel";
import RequirementsPreview from "../components/RequirementsPreview";
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
  createAiJob,
  createAiRequirementsJob,
  getAiDiscoveryJob,
  getAiJob,
  getAiRequirementsJob,
  type AiAnswer,
  type AiAnswerValue,
  type AiQuestion,
  type RequirementAnalysis,
} from "../lib/api";

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 60;
const MAX_DESCRIPTION_LENGTH = 2000;

type DiscoveryContext = {
  description: string;
  discoveryId: string;
  analysis: RequirementAnalysis | null;
  questions: AiQuestion[];
};

/**
 * Everything we know once the requirements job has succeeded — used as
 * the base context for architecture phases so they keep a path back to
 * requirements/questions/brief.
 */
type RequirementsContext = DiscoveryContext & {
  answers: AiAnswer[];
  requirementsJobId: string;
  requirements: Record<string, unknown>;
};

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
  | { kind: "error"; description: string; message: string }
  | ({
      kind: "requirements-loading";
      answers: AiAnswer[];
      requirementsJobId: string | null;
    } & DiscoveryContext)
  | ({
      kind: "requirements-ready";
      answers: AiAnswer[];
      requirementsJobId: string;
      requirements: unknown;
    } & DiscoveryContext)
  | ({
      kind: "requirements-error";
      answers: AiAnswer[];
      message: string;
    } & DiscoveryContext)
  | ({
      kind: "architecture-loading";
      architectureJobId: string | null;
    } & RequirementsContext)
  | ({
      kind: "architecture-ready";
      architectureJobId: string;
      architecture: unknown;
    } & RequirementsContext)
  | ({
      kind: "architecture-error";
      message: string;
    } & RequirementsContext);

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

  /* ── Requirements phase ─────────────────────────────────────────── */

  const pollRequirementsOnce = useCallback(
    async (ctx: DiscoveryContext, answers: AiAnswer[], reqJobId: string) => {
      if (cancelledRef.current) return;
      try {
        const idToken = await getIdToken();
        const res = await getAiRequirementsJob(idToken, reqJobId);
        if (cancelledRef.current) return;

        const job = res.job;
        if (job.status === "succeeded") {
          const req = job.requirements;
          if (!req || typeof req !== "object" || Array.isArray(req)) {
            setPhase({
              kind: "requirements-error",
              ...ctx,
              answers,
              message:
                "Requirements synthesis finished but the result was empty. Try again.",
            });
          } else {
            setPhase({
              kind: "requirements-ready",
              ...ctx,
              answers,
              requirementsJobId: reqJobId,
              requirements: req,
            });
          }
          stopPolling();
          return;
        }
        if (job.status === "failed") {
          setPhase({
            kind: "requirements-error",
            ...ctx,
            answers,
            message:
              "We couldn't synthesize requirements from those answers. Edit your answers and try again.",
          });
          stopPolling();
          return;
        }

        attemptRef.current += 1;
        if (attemptRef.current >= MAX_POLL_ATTEMPTS) {
          setPhase({
            kind: "requirements-error",
            ...ctx,
            answers,
            message:
              "Synthesizing requirements is taking longer than expected. Try again in a moment.",
          });
          stopPolling();
          return;
        }

        timerRef.current = window.setTimeout(() => {
          void pollRequirementsOnce(ctx, answers, reqJobId);
        }, POLL_INTERVAL_MS);
      } catch (err) {
        if (cancelledRef.current) return;
        setPhase({
          kind: "requirements-error",
          ...ctx,
          answers,
          message: safeErrorMessage(
            err,
            "We couldn't reach the requirements service. Try again."
          ),
        });
        stopPolling();
      }
    },
    [getIdToken, stopPolling]
  );

  const startRequirementsSubmission = useCallback(
    async (ctx: DiscoveryContext, answers: AiAnswer[]) => {
      stopPolling();
      setPhase({
        kind: "requirements-loading",
        ...ctx,
        answers,
        requirementsJobId: null,
      });
      try {
        const idToken = await getIdToken();
        const res = await createAiRequirementsJob(idToken, ctx.discoveryId, {
          answers,
        });
        if (cancelledRef.current) return;
        attemptRef.current = 0;
        setPhase({
          kind: "requirements-loading",
          ...ctx,
          answers,
          requirementsJobId: res.job.id,
        });
        timerRef.current = window.setTimeout(() => {
          void pollRequirementsOnce(ctx, answers, res.job.id);
        }, POLL_INTERVAL_MS);
      } catch (err) {
        if (cancelledRef.current) return;
        setPhase({
          kind: "requirements-error",
          ...ctx,
          answers,
          message: safeErrorMessage(
            err,
            "We couldn't start requirements synthesis. Try again."
          ),
        });
      }
    },
    [getIdToken, pollRequirementsOnce, stopPolling]
  );

  const handleSubmitAnswers = useCallback(
    (answers: AiAnswer[]) => {
      if (phase.kind !== "questions") return;
      void startRequirementsSubmission(
        {
          description: phase.description,
          discoveryId: phase.jobId,
          analysis: phase.analysis,
          questions: phase.questions,
        },
        answers
      );
    },
    [phase, startRequirementsSubmission]
  );

  const handleBackToQuestions = useCallback(() => {
    if (
      phase.kind !== "requirements-ready" &&
      phase.kind !== "requirements-error" &&
      phase.kind !== "requirements-loading"
    ) {
      return;
    }
    stopPolling();
    setPhase({
      kind: "questions",
      description: phase.description,
      jobId: phase.discoveryId,
      analysis: phase.analysis,
      questions: phase.questions,
    });
  }, [phase, stopPolling]);

  const handleRetryRequirements = useCallback(() => {
    if (phase.kind !== "requirements-error") return;
    void startRequirementsSubmission(
      {
        description: phase.description,
        discoveryId: phase.discoveryId,
        analysis: phase.analysis,
        questions: phase.questions,
      },
      phase.answers
    );
  }, [phase, startRequirementsSubmission]);

  /* ── Architecture phase ─────────────────────────────────────────── */

  const pollArchitectureOnce = useCallback(
    async (ctx: RequirementsContext, archJobId: string) => {
      if (cancelledRef.current) return;
      try {
        const idToken = await getIdToken();
        const job = await getAiJob(idToken, archJobId);
        if (cancelledRef.current) return;

        if (job.status === "succeeded") {
          const result = job.result;
          if (!result || typeof result !== "object" || Array.isArray(result)) {
            setPhase({
              kind: "architecture-error",
              ...ctx,
              message:
                "Architecture generation finished but the result was empty. Try again.",
            });
          } else {
            setPhase({
              kind: "architecture-ready",
              ...ctx,
              architectureJobId: archJobId,
              architecture: result,
            });
          }
          stopPolling();
          return;
        }
        if (job.status === "failed") {
          setPhase({
            kind: "architecture-error",
            ...ctx,
            message:
              "We couldn't generate an architecture from those requirements. Try again or edit your answers.",
          });
          stopPolling();
          return;
        }

        attemptRef.current += 1;
        if (attemptRef.current >= MAX_POLL_ATTEMPTS) {
          setPhase({
            kind: "architecture-error",
            ...ctx,
            message:
              "Generating the architecture is taking longer than expected. Try again in a moment.",
          });
          stopPolling();
          return;
        }

        timerRef.current = window.setTimeout(() => {
          void pollArchitectureOnce(ctx, archJobId);
        }, POLL_INTERVAL_MS);
      } catch (err) {
        if (cancelledRef.current) return;
        setPhase({
          kind: "architecture-error",
          ...ctx,
          message: safeErrorMessage(
            err,
            "We couldn't reach the architecture service. Try again."
          ),
        });
        stopPolling();
      }
    },
    [getIdToken, stopPolling]
  );

  const startArchitectureSubmission = useCallback(
    async (ctx: RequirementsContext) => {
      stopPolling();
      setPhase({
        kind: "architecture-loading",
        ...ctx,
        architectureJobId: null,
      });
      try {
        const idToken = await getIdToken();
        const summary = await createAiJob(idToken, {
          description: ctx.description,
          requirements: ctx.requirements,
        });
        if (cancelledRef.current) return;
        attemptRef.current = 0;
        setPhase({
          kind: "architecture-loading",
          ...ctx,
          architectureJobId: summary.id,
        });
        timerRef.current = window.setTimeout(() => {
          void pollArchitectureOnce(ctx, summary.id);
        }, POLL_INTERVAL_MS);
      } catch (err) {
        if (cancelledRef.current) return;
        setPhase({
          kind: "architecture-error",
          ...ctx,
          message: safeErrorMessage(
            err,
            "We couldn't start architecture generation. Try again."
          ),
        });
      }
    },
    [getIdToken, pollArchitectureOnce, stopPolling]
  );

  const handleGenerateArchitecture = useCallback(() => {
    if (phase.kind !== "requirements-ready") return;
    const req = phase.requirements;
    if (!req || typeof req !== "object" || Array.isArray(req)) return;
    void startArchitectureSubmission({
      description: phase.description,
      discoveryId: phase.discoveryId,
      analysis: phase.analysis,
      questions: phase.questions,
      answers: phase.answers,
      requirementsJobId: phase.requirementsJobId,
      requirements: req as Record<string, unknown>,
    });
  }, [phase, startArchitectureSubmission]);

  const handleBackToRequirements = useCallback(() => {
    if (
      phase.kind !== "architecture-loading" &&
      phase.kind !== "architecture-ready" &&
      phase.kind !== "architecture-error"
    ) {
      return;
    }
    stopPolling();
    setPhase({
      kind: "requirements-ready",
      description: phase.description,
      discoveryId: phase.discoveryId,
      analysis: phase.analysis,
      questions: phase.questions,
      answers: phase.answers,
      requirementsJobId: phase.requirementsJobId,
      requirements: phase.requirements,
    });
  }, [phase, stopPolling]);

  const handleRetryArchitecture = useCallback(() => {
    if (phase.kind !== "architecture-error") return;
    void startArchitectureSubmission({
      description: phase.description,
      discoveryId: phase.discoveryId,
      analysis: phase.analysis,
      questions: phase.questions,
      answers: phase.answers,
      requirementsJobId: phase.requirementsJobId,
      requirements: phase.requirements,
    });
  }, [phase, startArchitectureSubmission]);

  const initialAnswersMap = useMemo<
    Record<string, AiAnswerValue> | undefined
  >(() => {
    if (
      phase.kind !== "requirements-loading" &&
      phase.kind !== "requirements-ready" &&
      phase.kind !== "requirements-error"
    ) {
      return undefined;
    }
    const a = phase.answers;
    if (!a || a.length === 0) return undefined;
    const map: Record<string, AiAnswerValue> = {};
    for (const item of a) map[item.questionId] = item.value;
    return map;
  }, [phase]);

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
          onSubmitAnswers={handleSubmitAnswers}
          initialAnswers={initialAnswersMap}
        />
      </DiscoveryFlowFrame>
    );
  }
  if (phase.kind === "requirements-loading") {
    return (
      <DiscoveryFlowFrame>
        <RequirementsLoadingPanel onCancel={handleReset} />
      </DiscoveryFlowFrame>
    );
  }
  if (phase.kind === "requirements-ready") {
    return (
      <DiscoveryFlowFrame>
        <RequirementsPreview
          requirements={phase.requirements}
          onBackToQuestions={handleBackToQuestions}
          onStartOver={handleReset}
          onGenerateArchitecture={handleGenerateArchitecture}
        />
      </DiscoveryFlowFrame>
    );
  }
  if (phase.kind === "requirements-error") {
    return (
      <DiscoveryFlowFrame>
        <RequirementsErrorPanel
          message={phase.message}
          onRetry={handleRetryRequirements}
          onBackToQuestions={handleBackToQuestions}
          onReset={handleReset}
        />
      </DiscoveryFlowFrame>
    );
  }
  if (phase.kind === "architecture-loading") {
    return (
      <DiscoveryFlowFrame>
        <ArchitectureLoadingPanel onCancel={handleReset} />
      </DiscoveryFlowFrame>
    );
  }
  if (phase.kind === "architecture-ready") {
    return (
      <DiscoveryFlowFrame>
        <ArchitecturePreview
          architecture={phase.architecture}
          onBackToRequirements={handleBackToRequirements}
          onStartOver={handleReset}
        />
      </DiscoveryFlowFrame>
    );
  }
  if (phase.kind === "architecture-error") {
    return (
      <DiscoveryFlowFrame>
        <ArchitectureErrorPanel
          message={phase.message}
          onRetry={handleRetryArchitecture}
          onBackToRequirements={handleBackToRequirements}
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

function RequirementsErrorPanel({
  message,
  onRetry,
  onBackToQuestions,
  onReset,
}: {
  message: string;
  onRetry: () => void;
  onBackToQuestions: () => void;
  onReset: () => void;
}) {
  return (
    <div className="discovery-error-card" role="alert">
      <div className="discovery-flow-eyebrow">
        <span className="discovery-flow-eyebrow-dot" aria-hidden="true" />
        Requirements
      </div>
      <h2 className="discovery-flow-title">
        We couldn&rsquo;t synthesize requirements
      </h2>
      <p className="discovery-flow-sub">{message}</p>
      <div className="discovery-flow-foot discovery-flow-foot-split">
        <div className="discovery-flow-foot-left">
          <button
            type="button"
            className="wiz-btn wiz-btn-ghost"
            onClick={onReset}
          >
            Start over
          </button>
          <button
            type="button"
            className="wiz-btn wiz-btn-ghost"
            onClick={onBackToQuestions}
          >
            ← Back to questions
          </button>
        </div>
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

function ArchitectureErrorPanel({
  message,
  onRetry,
  onBackToRequirements,
  onReset,
}: {
  message: string;
  onRetry: () => void;
  onBackToRequirements: () => void;
  onReset: () => void;
}) {
  return (
    <div className="discovery-error-card" role="alert">
      <div className="discovery-flow-eyebrow">
        <span className="discovery-flow-eyebrow-dot" aria-hidden="true" />
        Architecture
      </div>
      <h2 className="discovery-flow-title">
        We couldn&rsquo;t generate the architecture
      </h2>
      <p className="discovery-flow-sub">{message}</p>
      <div className="discovery-flow-foot discovery-flow-foot-split">
        <div className="discovery-flow-foot-left">
          <button
            type="button"
            className="wiz-btn wiz-btn-ghost"
            onClick={onReset}
          >
            Start over
          </button>
          <button
            type="button"
            className="wiz-btn wiz-btn-ghost"
            onClick={onBackToRequirements}
          >
            ← Back to requirements
          </button>
        </div>
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
