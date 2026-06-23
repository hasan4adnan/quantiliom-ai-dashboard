import { useMemo, useState } from "react";
import type {
  AiAnswer,
  AiAnswerValue,
  AiQuestion,
  RequirementAnalysis,
} from "../lib/api";

type AnswerValue = AiAnswerValue;

type Props = {
  analysis: RequirementAnalysis | null;
  questions: AiQuestion[];
  onReset: () => void;
  /**
   * Called when the user finishes the review screen and is ready to send
   * answers to the backend requirements endpoint. The parent owns the
   * actual POST + polling so this component stays presentational.
   * Required-question validation runs in this component; the callback is
   * only invoked when every required question has a non-empty answer.
   */
  onSubmitAnswers?: (answers: AiAnswer[]) => void;
  /**
   * Seeded answer values, keyed by question id. Used when the parent
   * navigates the user back to questions from a later phase so their
   * prior work is preserved.
   */
  initialAnswers?: Record<string, AnswerValue>;
};

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

function isAnswered(q: AiQuestion, v: AnswerValue): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "number") return !Number.isNaN(v);
  if (typeof v === "boolean") return true;
  // Defensive: should not hit for any type in AiQuestionType.
  void q;
  return false;
}

export default function DiscoveryQuestionnaire({
  analysis,
  questions,
  onReset,
  onSubmitAnswers,
  initialAnswers,
}: Props) {
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>(() =>
    initialAnswers ? { ...initialAnswers } : {}
  );
  const [index, setIndex] = useState(0);

  const missingRequired = useMemo(
    () =>
      questions.filter(
        (q) => q.required && !isAnswered(q, answers[q.id] ?? null)
      ),
    [questions, answers]
  );

  if (questions.length === 0) {
    return (
      <div className="discovery-empty-card" role="region" aria-label="No questions">
        <div className="discovery-flow-eyebrow">
          <span className="discovery-flow-eyebrow-dot" aria-hidden="true" />
          Discovery
        </div>
        <h2 className="discovery-flow-title">No questions to ask yet</h2>
        <p className="discovery-flow-sub">
          The discovery service couldn&rsquo;t draft follow-up questions for
          this brief. Try a more specific description.
        </p>
        <div className="discovery-flow-foot">
          <button
            type="button"
            className="wiz-btn wiz-btn-dark"
            onClick={onReset}
          >
            Start over
          </button>
        </div>
      </div>
    );
  }

  const atReview = index >= questions.length;
  const current = atReview ? null : questions[index];

  function setAnswer(qId: string, v: AnswerValue) {
    setAnswers((prev) => ({ ...prev, [qId]: v }));
  }

  function next() {
    if (atReview) return;
    setIndex((i) => Math.min(i + 1, questions.length));
  }
  function prev() {
    setIndex((i) => Math.max(i - 1, 0));
  }

  const canAdvance = current
    ? !current.required || isAnswered(current, answers[current.id] ?? null)
    : true;

  function buildNormalizedAnswers(): AiAnswer[] {
    return questions.map((q) => ({
      questionId: q.id,
      value: normalizeAnswerValue(q, answers[q.id] ?? null),
    }));
  }

  function handleContinueToRequirements() {
    if (!onSubmitAnswers) return;
    if (missingRequired.length > 0) return;
    onSubmitAnswers(buildNormalizedAnswers());
  }

  const progressPct =
    (Math.min(index, questions.length) / questions.length) * 100;

  return (
    <div className="discovery-quest-shell" role="region" aria-label="Discovery questions">
      <header className="discovery-quest-header">
        <div className="discovery-flow-eyebrow">
          <span className="discovery-flow-eyebrow-dot" aria-hidden="true" />
          Discovery
        </div>
        <h2 className="discovery-flow-title">Discovery questions</h2>
        {analysis?.briefSummary ? (
          <p className="discovery-flow-sub">{analysis.briefSummary}</p>
        ) : null}
        <div className="discovery-quest-meta">
          <span className="discovery-meta-chip">
            <span>Domain</span>
            <strong>{domainLabel(analysis?.domain)}</strong>
          </span>
          <span className="discovery-meta-chip">
            <span>Questions</span>
            <strong>{questions.length}</strong>
          </span>
        </div>
      </header>

      <div className="discovery-quest-progress" aria-hidden="true">
        <div
          className="discovery-quest-progress-bar"
          style={{ width: `${progressPct}%` }}
        />
      </div>
      <div className="discovery-quest-progress-text">
        {atReview
          ? `${questions.length} of ${questions.length} reviewed`
          : `Question ${index + 1} of ${questions.length}`}
      </div>

      <div className="discovery-quest-body">
        {atReview ? (
          <ReviewPanel questions={questions} answers={answers} />
        ) : (
          <QuestionCard
            question={current!}
            value={answers[current!.id] ?? null}
            onChange={(v) => setAnswer(current!.id, v)}
          />
        )}
      </div>

      <div className="discovery-flow-foot discovery-flow-foot-split">
        <div className="discovery-flow-foot-left">
          <button
            type="button"
            className="wiz-btn wiz-btn-ghost"
            onClick={onReset}
          >
            Start over
          </button>
          {index > 0 ? (
            <button
              type="button"
              className="wiz-btn wiz-btn-ghost"
              onClick={prev}
            >
              ← Previous
            </button>
          ) : null}
        </div>
        {atReview ? (
          <div className="discovery-final-cluster">
            <span className="discovery-final-note">
              {missingRequired.length === 0
                ? "We'll convert your answers into normalized requirements."
                : missingRequired.length === 1
                ? "1 required question still needs an answer before you can continue."
                : `${missingRequired.length} required questions still need answers before you can continue.`}
            </span>
            <button
              type="button"
              className="wiz-btn wiz-btn-dark"
              onClick={handleContinueToRequirements}
              disabled={!onSubmitAnswers || missingRequired.length > 0}
              aria-disabled={!onSubmitAnswers || missingRequired.length > 0}
            >
              Continue to requirements →
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="wiz-btn wiz-btn-dark"
            onClick={next}
            disabled={!canAdvance}
            aria-disabled={!canAdvance}
          >
            {index === questions.length - 1 ? "Review answers" : "Next"} →
          </button>
        )}
      </div>
    </div>
  );
}

function QuestionCard({
  question,
  value,
  onChange,
}: {
  question: AiQuestion;
  value: AnswerValue;
  onChange: (v: AnswerValue) => void;
}) {
  return (
    <article className="discovery-quest-card">
      <div className="discovery-quest-card-meta">
        <span className="discovery-cat-chip">{question.category}</span>
        {question.required ? (
          <span className="discovery-required-tag">Required</span>
        ) : (
          <span className="discovery-optional-tag">Optional</span>
        )}
      </div>
      <h3 className="discovery-quest-question">{question.text}</h3>
      {question.helpText ? (
        <p className="discovery-quest-help">{question.helpText}</p>
      ) : null}

      <div className="discovery-quest-input">
        <QuestionInput question={question} value={value} onChange={onChange} />
      </div>
    </article>
  );
}

function QuestionInput({
  question,
  value,
  onChange,
}: {
  question: AiQuestion;
  value: AnswerValue;
  onChange: (v: AnswerValue) => void;
}) {
  if (question.type === "single_select") {
    const options = question.options ?? [];
    if (options.length === 0) return <FallbackText value={value} onChange={onChange} />;
    return (
      <ul className="discovery-opt-list" role="radiogroup">
        {options.map((opt) => {
          const selected = value === opt;
          return (
            <li key={opt}>
              <button
                type="button"
                className={`discovery-opt${selected ? " is-selected" : ""}`}
                role="radio"
                aria-checked={selected}
                onClick={() => onChange(opt)}
              >
                <span className="discovery-opt-marker" aria-hidden="true" />
                <span className="discovery-opt-label">{opt}</span>
              </button>
            </li>
          );
        })}
      </ul>
    );
  }

  if (question.type === "multi_select") {
    const options = question.options ?? [];
    const arr = Array.isArray(value) ? (value as string[]) : [];
    const toggle = (opt: string) => {
      if (arr.includes(opt)) onChange(arr.filter((v) => v !== opt));
      else onChange([...arr, opt]);
    };
    if (options.length === 0) return <FallbackText value={value} onChange={onChange} />;
    return (
      <ul className="discovery-opt-list">
        {options.map((opt) => {
          const selected = arr.includes(opt);
          return (
            <li key={opt}>
              <button
                type="button"
                className={`discovery-opt is-checkbox${
                  selected ? " is-selected" : ""
                }`}
                role="checkbox"
                aria-checked={selected}
                onClick={() => toggle(opt)}
              >
                <span
                  className="discovery-opt-marker is-square"
                  aria-hidden="true"
                />
                <span className="discovery-opt-label">{opt}</span>
              </button>
            </li>
          );
        })}
      </ul>
    );
  }

  if (question.type === "boolean") {
    const sel = typeof value === "boolean" ? value : null;
    return (
      <div className="discovery-bool-grid">
        <button
          type="button"
          className={`discovery-bool${sel === true ? " is-selected" : ""}`}
          onClick={() => onChange(true)}
          aria-pressed={sel === true}
        >
          Yes
        </button>
        <button
          type="button"
          className={`discovery-bool${sel === false ? " is-selected" : ""}`}
          onClick={() => onChange(false)}
          aria-pressed={sel === false}
        >
          No
        </button>
      </div>
    );
  }

  if (question.type === "number") {
    const v = typeof value === "number" ? value : "";
    return (
      <input
        type="number"
        className="discovery-num-input"
        value={v}
        inputMode="numeric"
        placeholder="Enter a number"
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") {
            onChange(null);
            return;
          }
          const n = Number(raw);
          onChange(Number.isFinite(n) ? n : null);
        }}
      />
    );
  }

  // text
  return <FallbackText value={value} onChange={onChange} />;
}

function FallbackText({
  value,
  onChange,
}: {
  value: AnswerValue;
  onChange: (v: AnswerValue) => void;
}) {
  return (
    <textarea
      className="discovery-text-input"
      value={typeof value === "string" ? value : ""}
      onChange={(e) => onChange(e.target.value)}
      rows={4}
      maxLength={1000}
      placeholder="Type your answer…"
    />
  );
}

function ReviewPanel({
  questions,
  answers,
}: {
  questions: AiQuestion[];
  answers: Record<string, AnswerValue>;
}) {
  return (
    <article className="discovery-quest-card discovery-review">
      <div className="discovery-quest-card-meta">
        <span className="discovery-cat-chip">Review</span>
      </div>
      <h3 className="discovery-quest-question">Review your answers</h3>
      <p className="discovery-quest-help">
        These answers will feed requirements synthesis when that step is
        connected.
      </p>
      <dl className="discovery-review-list">
        {questions.map((q) => (
          <div className="discovery-review-row" key={q.id}>
            <dt className="discovery-review-q">{q.text}</dt>
            <dd className="discovery-review-a">{formatAnswer(q, answers[q.id])}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}

function formatAnswer(q: AiQuestion, v: AnswerValue | undefined): string {
  const skipped = q.required ? "— (not answered)" : "— (skipped)";
  if (v === undefined || v === null) return skipped;
  if (typeof v === "string") return v.trim() === "" ? skipped : v;
  if (Array.isArray(v)) return v.length === 0 ? skipped : v.join(", ");
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "number") return String(v);
  return "—";
}

/**
 * Coerce a local React-state answer into the shape the backend wants:
 *   single_select / text → string | null
 *   multi_select        → string[] | null (empty array becomes null)
 *   number              → number | null
 *   boolean             → boolean | null
 *
 * Text values are trimmed; whitespace-only strings collapse to null so
 * the worker's Zod validation treats them as explicit skips.
 */
function normalizeAnswerValue(
  question: AiQuestion,
  raw: AnswerValue
): AiAnswerValue {
  switch (question.type) {
    case "text": {
      if (typeof raw !== "string") return null;
      const trimmed = raw.trim();
      return trimmed.length === 0 ? null : trimmed;
    }
    case "single_select": {
      return typeof raw === "string" && raw.length > 0 ? raw : null;
    }
    case "multi_select": {
      if (!Array.isArray(raw)) return null;
      const cleaned = raw.filter((x): x is string => typeof x === "string");
      return cleaned.length === 0 ? null : cleaned;
    }
    case "number": {
      return typeof raw === "number" && Number.isFinite(raw) ? raw : null;
    }
    case "boolean": {
      return typeof raw === "boolean" ? raw : null;
    }
    default: {
      // Future question type — pass through if already a known scalar.
      if (
        typeof raw === "string" ||
        typeof raw === "number" ||
        typeof raw === "boolean" ||
        raw === null
      ) {
        return raw;
      }
      if (Array.isArray(raw)) {
        const cleaned = raw.filter((x): x is string => typeof x === "string");
        return cleaned.length === 0 ? null : cleaned;
      }
      return null;
    }
  }
}
