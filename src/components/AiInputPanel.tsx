import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { ArrowRightIcon } from "./icons";
import {
  createAiDiscoveryJob,
  getAiDiscoveryJob,
  type AiQuestion,
  type RequirementAnalysis,
} from "../lib/api";

const EXAMPLES: { label: string; seed: string }[] = [
  {
    label: "SaaS MVP",
    seed: "A multi-tenant SaaS for small marketing teams to plan and schedule content campaigns.",
  },
  {
    label: "Mobile app",
    seed: "An iOS + Android habit tracker with offline sync and weekly insight reports.",
  },
  {
    label: "AI tool",
    seed: "An internal AI assistant that summarises customer support tickets and proposes responses.",
  },
  {
    label: "Marketplace",
    seed: "A two-sided marketplace connecting freelance translators with publishers, with escrow payments.",
  },
  {
    label: "Internal dashboard",
    seed: "An internal ops dashboard for monitoring inventory across 12 warehouses in near real time.",
  },
];

/**
 * Bounded polling: 60 attempts × 3 seconds = 3 minutes max. The backend
 * worker typically finishes within ~10–30s; this cap protects the UI from
 * a stuck queue without ever looping forever.
 */
const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 60;
const MAX_DESCRIPTION_LENGTH = 2000;

type Props = {
  /**
   * Resolves a fresh Firebase ID token from the authenticated session.
   * Required for any backend call; absent in tests/storybook contexts only.
   */
  getIdToken?: () => Promise<string>;
};

type State =
  | { kind: "idle" }
  | { kind: "starting" }
  | { kind: "polling"; jobId: string }
  | {
      kind: "succeeded";
      analysis: RequirementAnalysis | null;
      questions: AiQuestion[];
    }
  | { kind: "failed"; message: string };

function safeErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) {
    const m = err.message;
    return m.length > 240 ? `${m.slice(0, 240)}…` : m;
  }
  return fallback;
}

function domainLabel(d: RequirementAnalysis["domain"] | undefined): string {
  switch (d) {
    case "saas":
      return "SaaS";
    case "marketplace":
      return "Marketplace";
    case "chatbot":
      return "Chatbot";
    case "realtime_chat":
      return "Realtime chat";
    case "ecommerce":
      return "E-commerce";
    case "other":
      return "Other";
    default:
      return "—";
  }
}

export default function AiInputPanel({ getIdToken }: Props) {
  const [value, setValue] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });

  /**
   * Tracks whether the component is still mounted. setState calls in async
   * branches must check this ref before firing to avoid React's "update on
   * unmounted component" warning and to ensure poll fallout doesn't replay.
   */
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
    if (!cancelledRef.current) {
      setState({ kind: "idle" });
    }
  }, [stopPolling]);

  const pollOnce = useCallback(
    async (jobId: string) => {
      if (cancelledRef.current) return;
      if (!getIdToken) {
        setState({
          kind: "failed",
          message: "Your session is not available. Reload and try again.",
        });
        return;
      }
      try {
        const idToken = await getIdToken();
        const res = await getAiDiscoveryJob(idToken, jobId);
        if (cancelledRef.current) return;

        const job = res.job;
        if (job.status === "succeeded") {
          const questions = Array.isArray(job.questions) ? job.questions : [];
          setState({
            kind: "succeeded",
            analysis: job.analysis ?? null,
            questions,
          });
          stopPolling();
          return;
        }
        if (job.status === "failed") {
          setState({
            kind: "failed",
            message:
              "We couldn't generate questions for that description. Try editing the brief and sending it again.",
          });
          stopPolling();
          return;
        }

        attemptRef.current += 1;
        if (attemptRef.current >= MAX_POLL_ATTEMPTS) {
          setState({
            kind: "failed",
            message:
              "Generating questions is taking longer than expected. Try again in a moment.",
          });
          stopPolling();
          return;
        }

        timerRef.current = window.setTimeout(() => {
          void pollOnce(jobId);
        }, POLL_INTERVAL_MS);
      } catch (err) {
        if (cancelledRef.current) return;
        setState({
          kind: "failed",
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

  const handleSubmit = useCallback(async () => {
    const description = value.trim();
    if (!description) return;
    if (description.length > MAX_DESCRIPTION_LENGTH) {
      setState({
        kind: "failed",
        message: `Please keep your description under ${MAX_DESCRIPTION_LENGTH} characters.`,
      });
      return;
    }
    if (!getIdToken) {
      setState({
        kind: "failed",
        message: "Your session is not available. Reload and try again.",
      });
      return;
    }

    stopPolling();
    setState({ kind: "starting" });
    try {
      const idToken = await getIdToken();
      const res = await createAiDiscoveryJob(idToken, { description });
      if (cancelledRef.current) return;

      attemptRef.current = 0;
      setState({ kind: "polling", jobId: res.job.id });
      timerRef.current = window.setTimeout(() => {
        void pollOnce(res.job.id);
      }, POLL_INTERVAL_MS);
    } catch (err) {
      if (cancelledRef.current) return;
      setState({
        kind: "failed",
        message: safeErrorMessage(
          err,
          "We couldn't start the discovery service. Try again."
        ),
      });
    }
  }, [value, getIdToken, pollOnce, stopPolling]);

  function handleChipClick(seed: string) {
    if (state.kind === "starting" || state.kind === "polling") return;
    setValue((prev) => (prev.trim().length === 0 ? seed : prev));
  }

  const hasText = value.trim().length > 0;
  const inFlight = state.kind === "starting" || state.kind === "polling";
  const buttonLabel = inFlight
    ? "Generating questions"
    : "Start architecture analysis";

  return (
    <section aria-label="Describe your software project">
      <div className="ai-panel">
        <div className="ai-panel-head">
          <div className="ai-panel-head-left">
            <span className="ai-panel-head-dot" aria-hidden="true" />
            <span>Architecture brief</span>
          </div>
          <span className="ai-panel-head-tag">Preview</span>
        </div>

        <label htmlFor="ai-input" className="sr-only" style={{ display: "none" }}>
          Describe your software project
        </label>
        <textarea
          id="ai-input"
          className="ai-textarea"
          placeholder="Describe your software project — the problem you are solving, who it is for, and any constraints. Quantiliom will help you reason about architecture, stack decisions, modules, risks, and next steps."
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={6}
          spellCheck
          disabled={inFlight}
          maxLength={MAX_DESCRIPTION_LENGTH + 64}
        />

        <div className="ai-chips" role="group" aria-label="Example project types">
          {EXAMPLES.map((ex) => (
            <button
              type="button"
              key={ex.label}
              className="chip"
              onClick={() => handleChipClick(ex.seed)}
              disabled={inFlight}
            >
              <span className="chip-glyph" aria-hidden="true">
                +
              </span>
              {ex.label}
            </button>
          ))}
        </div>

        <div className="ai-panel-foot">
          <div className="ai-foot-meta">
            <kbd>⌘</kbd>
            <kbd>↵</kbd>
            <span style={{ marginLeft: 6 }}>to analyze</span>
          </div>
          <button
            type="button"
            className="btn-primary"
            onClick={handleSubmit}
            disabled={!hasText || inFlight}
            aria-disabled={!hasText || inFlight}
            aria-busy={inFlight}
          >
            {inFlight ? (
              <span
                className="discovery-inline-spinner"
                aria-hidden="true"
                style={SPINNER_STYLE}
              />
            ) : null}
            <span>{buttonLabel}</span>
            {!inFlight ? (
              <ArrowRightIcon size={14} className="btn-arrow" />
            ) : null}
          </button>
        </div>
      </div>

      {inFlight ? (
        <div className="coming-soon-notice" role="status" aria-live="polite">
          <strong>Generating questions</strong>
          <span>
            We&rsquo;re analysing your description and drafting follow-up
            questions. This usually takes 10&ndash;30 seconds.
          </span>
        </div>
      ) : null}

      {state.kind === "failed" ? (
        <div className="coming-soon-notice" role="alert">
          <strong>Try again</strong>
          <span>{state.message}</span>
        </div>
      ) : null}

      {state.kind === "succeeded" ? (
        <DiscoveryResult
          analysis={state.analysis}
          questions={state.questions}
          onReset={handleReset}
        />
      ) : null}
    </section>
  );
}

const SPINNER_STYLE: CSSProperties = {
  width: 14,
  height: 14,
  borderWidth: 1.4,
  marginRight: 2,
};

function DiscoveryResult({
  analysis,
  questions,
  onReset,
}: {
  analysis: RequirementAnalysis | null;
  questions: AiQuestion[];
  onReset: () => void;
}) {
  const hasQuestions = questions.length > 0;
  return (
    <div className="discovery-result" role="region" aria-label="Generated questions">
      <div className="discovery-result-head">
        <span className="discovery-result-eyebrow">
          <span className="discovery-result-eyebrow-dot" aria-hidden="true" />
          Discovery
        </span>
        <button
          type="button"
          className="discovery-result-reset"
          onClick={onReset}
        >
          Start over
        </button>
      </div>

      {analysis?.briefSummary ? (
        <p className="discovery-result-summary">{analysis.briefSummary}</p>
      ) : null}

      <div className="discovery-result-meta" aria-label="Discovery summary">
        <span className="discovery-result-meta-chip">
          <span>Domain</span>
          <strong>{domainLabel(analysis?.domain)}</strong>
        </span>
        <span className="discovery-result-meta-chip">
          <span>Questions</span>
          <strong>{questions.length}</strong>
        </span>
      </div>

      {hasQuestions ? (
        <ol className="discovery-result-questions">
          {questions.map((q, i) => (
            <li key={q.id} className="discovery-result-question">
              <span className="discovery-result-question-index">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="discovery-result-question-text">{q.text}</span>
              <span className="discovery-result-question-cat">{q.category}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="discovery-result-empty">
          The discovery service didn&rsquo;t return any follow-up questions for
          this brief. Try a more specific description.
        </p>
      )}
    </div>
  );
}
