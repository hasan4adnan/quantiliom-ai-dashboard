import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import ArchitectureLoadingPanel from "../components/ArchitectureLoadingPanel";
import ArchitecturePreview from "../components/ArchitecturePreview";
import DiscoveryLoadingPanel from "../components/DiscoveryLoadingPanel";
import DiscoveryQuestionnaire from "../components/DiscoveryQuestionnaire";
import RequirementsLoadingPanel from "../components/RequirementsLoadingPanel";
import RequirementsPreview from "../components/RequirementsPreview";
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
import type { WorkspaceState } from "./ArchitectureWorkspace";

/**
 * Onboarding seed handed to this page from App.Shell when the user
 * submits a brief from DashboardHome. Kept intentionally small: the
 * full discovery/requirements/architecture state lives in this page's
 * own React reducer-style phase machine below.
 */
export type OnboardingSeed = {
  description: string;
  openedAt: string;
};

/* ── Per-phase polling budgets ─────────────────────────────────────── */
// Discovery + requirements typically finish in 30–60s and rarely exceed
// 180s, so we keep their bounded-polling window short to surface dead
// jobs quickly. Architecture's `generateAlternativeDecisionWithDerived
// Outputs` regularly runs ~3–4 minutes per the latest runtime
// diagnosis (165–245s observed), so it gets a wider 6-minute window —
// large enough to cover the slow path without making genuinely-stuck
// jobs hang the UI forever.
const DISCOVERY_POLL_INTERVAL_MS = 3000;
const DISCOVERY_MAX_POLL_ATTEMPTS = 60;
const REQUIREMENTS_POLL_INTERVAL_MS = 3000;
const REQUIREMENTS_MAX_POLL_ATTEMPTS = 60;
const ARCHITECTURE_POLL_INTERVAL_MS = 3000;
const ARCHITECTURE_MAX_POLL_ATTEMPTS = 120;

const MAX_DESCRIPTION_LENGTH = 2000;

type DiscoveryContext = {
  description: string;
  discoveryId: string;
  analysis: RequirementAnalysis | null;
  questions: AiQuestion[];
};

type RequirementsContext = DiscoveryContext & {
  answers: AiAnswer[];
  requirementsJobId: string;
  requirements: Record<string, unknown>;
};

type Phase =
  | { kind: "idle" }
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
      /**
       * When the architecture worker is still alive (e.g. our polling
       * budget expired before it finished) we keep the BullMQ jobId
       * around so the user can "Continue checking" the same job rather
       * than duplicating provider work with a fresh enqueue.
       */
      architectureJobId: string | null;
    } & RequirementsContext);

type Props = {
  seed: OnboardingSeed | null;
  getIdToken: () => Promise<string>;
  onBackHome: () => void;
  onOpenArchitectureWorkspace: (state: WorkspaceState) => void;
};

function safeErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) {
    const m = err.message;
    return m.length > 240 ? `${m.slice(0, 240)}…` : m;
  }
  return fallback;
}

export default function OnboardingFlow({
  seed,
  getIdToken,
  onBackHome,
  onOpenArchitectureWorkspace,
}: Props) {
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });

  const cancelledRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const attemptRef = useRef(0);
  // The seed is normally consumed exactly once on mount. We track it
  // here so we can re-trigger discovery if the parent ever feeds us a
  // fresh seed (different `openedAt`) without us being unmounted.
  const consumedSeedKeyRef = useRef<string | null>(null);

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
    if (!cancelledRef.current) setPhase({ kind: "idle" });
    onBackHome();
  }, [stopPolling, onBackHome]);

  /* ── Discovery phase ───────────────────────────────────────────── */

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
        if (attemptRef.current >= DISCOVERY_MAX_POLL_ATTEMPTS) {
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
        }, DISCOVERY_POLL_INTERVAL_MS);
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
        }, DISCOVERY_POLL_INTERVAL_MS);
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

  // Consume the seed on mount (and whenever a fresh seed key arrives).
  useEffect(() => {
    if (!seed) return;
    const key = `${seed.openedAt}::${seed.description}`;
    if (consumedSeedKeyRef.current === key) return;
    consumedSeedKeyRef.current = key;

    const trimmed = seed.description.trim();
    if (!trimmed) {
      setPhase({
        kind: "error",
        description: seed.description,
        message: "Please describe your project before continuing.",
      });
      return;
    }
    if (trimmed.length > MAX_DESCRIPTION_LENGTH) {
      setPhase({
        kind: "error",
        description: trimmed,
        message: `Please keep your description under ${MAX_DESCRIPTION_LENGTH} characters.`,
      });
      return;
    }
    void startDiscovery(trimmed);
  }, [seed, startDiscovery]);

  const handleRetry = useCallback(() => {
    if (phase.kind !== "error") return;
    void startDiscovery(phase.description);
  }, [phase, startDiscovery]);

  /* ── Requirements phase ────────────────────────────────────────── */

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
        if (attemptRef.current >= REQUIREMENTS_MAX_POLL_ATTEMPTS) {
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
        }, REQUIREMENTS_POLL_INTERVAL_MS);
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
        }, REQUIREMENTS_POLL_INTERVAL_MS);
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

  /* ── Architecture phase ────────────────────────────────────────── */

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
              architectureJobId: archJobId,
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
            architectureJobId: archJobId,
            message:
              "We couldn't generate an architecture from those requirements. Try again or edit your answers.",
          });
          stopPolling();
          return;
        }

        attemptRef.current += 1;
        if (attemptRef.current >= ARCHITECTURE_MAX_POLL_ATTEMPTS) {
          // Soft-timeout copy: the worker is almost certainly still
          // running. We preserve archJobId so the user can resume
          // polling the same job rather than enqueueing a duplicate.
          setPhase({
            kind: "architecture-error",
            ...ctx,
            architectureJobId: archJobId,
            message:
              "Architecture is still taking longer than usual. This can happen for larger outputs — you can keep checking the same job or generate a new one.",
          });
          stopPolling();
          return;
        }

        timerRef.current = window.setTimeout(() => {
          void pollArchitectureOnce(ctx, archJobId);
        }, ARCHITECTURE_POLL_INTERVAL_MS);
      } catch (err) {
        if (cancelledRef.current) return;
        setPhase({
          kind: "architecture-error",
          ...ctx,
          architectureJobId: archJobId,
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
        }, ARCHITECTURE_POLL_INTERVAL_MS);
      } catch (err) {
        if (cancelledRef.current) return;
        setPhase({
          kind: "architecture-error",
          ...ctx,
          architectureJobId: null,
          message: safeErrorMessage(
            err,
            "We couldn't start architecture generation. Try again."
          ),
        });
      }
    },
    [getIdToken, pollArchitectureOnce, stopPolling]
  );

  const resumeArchitecturePolling = useCallback(
    (ctx: RequirementsContext, archJobId: string) => {
      stopPolling();
      attemptRef.current = 0;
      setPhase({
        kind: "architecture-loading",
        ...ctx,
        architectureJobId: archJobId,
      });
      timerRef.current = window.setTimeout(() => {
        void pollArchitectureOnce(ctx, archJobId);
      }, ARCHITECTURE_POLL_INTERVAL_MS);
    },
    [pollArchitectureOnce, stopPolling]
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

  const handleOpenWorkspace = useCallback(() => {
    if (phase.kind !== "architecture-ready") return;
    onOpenArchitectureWorkspace({
      architecture: phase.architecture,
      brief: phase.description,
      requirements: phase.requirements,
      discoveryJobId: phase.discoveryId,
      requirementsJobId: phase.requirementsJobId,
      architectureJobId: phase.architectureJobId,
      openedAt: new Date().toISOString(),
    });
  }, [phase, onOpenArchitectureWorkspace]);

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

  const handleContinueCheckingArchitecture = useCallback(() => {
    if (phase.kind !== "architecture-error") return;
    if (!phase.architectureJobId) return;
    resumeArchitecturePolling(
      {
        description: phase.description,
        discoveryId: phase.discoveryId,
        analysis: phase.analysis,
        questions: phase.questions,
        answers: phase.answers,
        requirementsJobId: phase.requirementsJobId,
        requirements: phase.requirements,
      },
      phase.architectureJobId
    );
  }, [phase, resumeArchitecturePolling]);

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

  if (!seed && phase.kind === "idle") {
    return (
      <OnboardingShellLayout onBackHome={onBackHome}>
        <section className="onboarding-empty" aria-label="No active onboarding">
          <div className="discovery-flow-eyebrow">
            <span className="discovery-flow-eyebrow-dot" aria-hidden="true" />
            AI Discovery
          </div>
          <h2 className="discovery-flow-title">No active onboarding session</h2>
          <p className="discovery-flow-sub">
            Start from Home to describe your project. We&rsquo;ll turn your
            idea into requirements before generating an architecture.
          </p>
          <div className="discovery-flow-foot">
            <button
              type="button"
              className="wiz-btn wiz-btn-dark"
              onClick={onBackHome}
            >
              Back to Home →
            </button>
          </div>
        </section>
      </OnboardingShellLayout>
    );
  }

  if (phase.kind === "loading") {
    return (
      <OnboardingShellLayout onBackHome={onBackHome}>
        <DiscoveryLoadingPanel
          description={phase.description}
          onCancel={handleReset}
        />
      </OnboardingShellLayout>
    );
  }
  if (phase.kind === "questions") {
    return (
      <OnboardingShellLayout onBackHome={onBackHome}>
        <DiscoveryQuestionnaire
          analysis={phase.analysis}
          questions={phase.questions}
          onReset={handleReset}
          onSubmitAnswers={handleSubmitAnswers}
          initialAnswers={initialAnswersMap}
        />
      </OnboardingShellLayout>
    );
  }
  if (phase.kind === "requirements-loading") {
    return (
      <OnboardingShellLayout onBackHome={onBackHome}>
        <RequirementsLoadingPanel onCancel={handleReset} />
      </OnboardingShellLayout>
    );
  }
  if (phase.kind === "requirements-ready") {
    return (
      <OnboardingShellLayout onBackHome={onBackHome}>
        <RequirementsPreview
          requirements={phase.requirements}
          onBackToQuestions={handleBackToQuestions}
          onStartOver={handleReset}
          onGenerateArchitecture={handleGenerateArchitecture}
        />
      </OnboardingShellLayout>
    );
  }
  if (phase.kind === "requirements-error") {
    return (
      <OnboardingShellLayout onBackHome={onBackHome}>
        <RequirementsErrorPanel
          message={phase.message}
          onRetry={handleRetryRequirements}
          onBackToQuestions={handleBackToQuestions}
          onReset={handleReset}
        />
      </OnboardingShellLayout>
    );
  }
  if (phase.kind === "architecture-loading") {
    return (
      <OnboardingShellLayout onBackHome={onBackHome}>
        <ArchitectureLoadingPanel onCancel={handleReset} />
      </OnboardingShellLayout>
    );
  }
  if (phase.kind === "architecture-ready") {
    return (
      <OnboardingShellLayout onBackHome={onBackHome}>
        <ArchitecturePreview
          architecture={phase.architecture}
          onBackToRequirements={handleBackToRequirements}
          onStartOver={handleReset}
          onOpenWorkspace={handleOpenWorkspace}
        />
      </OnboardingShellLayout>
    );
  }
  if (phase.kind === "architecture-error") {
    return (
      <OnboardingShellLayout onBackHome={onBackHome}>
        <ArchitectureErrorPanel
          message={phase.message}
          canContinueChecking={phase.architectureJobId !== null}
          onContinueChecking={handleContinueCheckingArchitecture}
          onRetry={handleRetryArchitecture}
          onBackToRequirements={handleBackToRequirements}
          onReset={handleReset}
        />
      </OnboardingShellLayout>
    );
  }
  if (phase.kind === "error") {
    return (
      <OnboardingShellLayout onBackHome={onBackHome}>
        <DiscoveryErrorPanel
          message={phase.message}
          onRetry={handleRetry}
          onReset={handleReset}
        />
      </OnboardingShellLayout>
    );
  }

  // phase.kind === "idle" with seed: the seed-consuming effect runs on
  // next tick, so render a brief loading placeholder rather than an
  // empty page.
  return (
    <OnboardingShellLayout onBackHome={onBackHome}>
      <DiscoveryLoadingPanel
        description={seed?.description ?? ""}
        onCancel={handleReset}
      />
    </OnboardingShellLayout>
  );
}

/* ── Local presentational helpers ──────────────────────────────────── */

/**
 * Standalone full-viewport wrapper. Renders OUTSIDE the dashboard
 * shell, so the main Sidebar and Topbar are not visible while the user
 * is in onboarding. Provides its own minimal brand header + back-to-
 * dashboard action, then drops the flow content into a focused, gently
 * constrained main column.
 */
function OnboardingShellLayout({
  children,
  onBackHome,
}: {
  children: ReactNode;
  onBackHome: () => void;
}) {
  return (
    <div className="onboarding-standalone" aria-label="AI Discovery">
      <header className="onboarding-standalone-header">
        <div className="onboarding-standalone-brand">
          <span className="onboarding-standalone-brand-mark" aria-hidden="true">
            Q
          </span>
          <div className="onboarding-standalone-brand-text">
            <span className="onboarding-standalone-brand-name">
              Quantiliom AI
            </span>
            <span className="onboarding-standalone-brand-sub">AI Discovery</span>
          </div>
        </div>
        <button
          type="button"
          className="wiz-btn wiz-btn-ghost"
          onClick={onBackHome}
        >
          ← Back to dashboard
        </button>
      </header>
      <main className="onboarding-standalone-main">
        <div className="onboarding-shell">
          <div className="discovery-flow">{children}</div>
        </div>
      </main>
    </div>
  );
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
        <button type="button" className="wiz-btn wiz-btn-dark" onClick={onRetry}>
          Try again →
        </button>
      </div>
    </div>
  );
}

function ArchitectureErrorPanel({
  message,
  canContinueChecking,
  onContinueChecking,
  onRetry,
  onBackToRequirements,
  onReset,
}: {
  message: string;
  canContinueChecking: boolean;
  onContinueChecking: () => void;
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
      <h2 className="discovery-flow-title">Architecture is taking a while</h2>
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
        <div className="discovery-final-cluster">
          {canContinueChecking ? (
            <button
              type="button"
              className="wiz-btn wiz-btn-ghost"
              onClick={onContinueChecking}
            >
              Keep checking the same job
            </button>
          ) : null}
          <button
            type="button"
            className="wiz-btn wiz-btn-dark"
            onClick={onRetry}
          >
            Generate again →
          </button>
        </div>
      </div>
    </div>
  );
}

function DiscoveryErrorPanel({
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
        <button type="button" className="wiz-btn wiz-btn-dark" onClick={onRetry}>
          Try again →
        </button>
      </div>
    </div>
  );
}
