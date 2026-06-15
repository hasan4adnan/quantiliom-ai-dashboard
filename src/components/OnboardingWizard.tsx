import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { postOnboarding, type LocalUser, type OnboardingAnswers } from "../lib/api";
import { auth } from "../lib/firebase";

type Props = {
  onComplete: (updatedUser: LocalUser) => void;
};

type SingleSlide = {
  type: "single";
  field: keyof Omit<
    OnboardingAnswers,
    "detailLevel" | "preferredLanguage" | "planPreference"
  >;
  question: string;
  helper: string;
  options: { value: string; label: string }[];
};

type PlanFeature = { ok: boolean; text: string };
type PlanOption = {
  value: string;
  tier: string;
  name: string;
  monthlyPrice: string;
  annualPrice: string;
  annualOrig?: string;
  annualNote?: string;
  period: string;
  pro?: boolean;
  tagline: string;
  features: PlanFeature[];
};

type PricingSlide = {
  type: "pricing";
  field: "planPreference";
  question: string;
  helper: string;
  options: PlanOption[];
};

type Slide = SingleSlide | PricingSlide;

const STEP_LABELS = [
  "Your role",
  "Technical level",
  "Primary use case",
  "Project stage",
  "Team size",
  "Your plan",
];

const TECHNICAL_TO_DETAIL: Record<string, string> = {
  beginner: "simple",
  intermediate: "balanced",
  advanced: "technical",
};

const SLIDES: Slide[] = [
  {
    type: "single",
    field: "role",
    question: "What best describes your role?",
    helper: "Pick the one that fits you best — you can change this later.",
    options: [
      { value: "founder", label: "Founder / Entrepreneur" },
      { value: "developer", label: "Developer" },
      { value: "student", label: "Student" },
      { value: "product_manager", label: "Product Manager" },
      { value: "freelancer_agency", label: "Freelancer / Agency" },
      { value: "other", label: "Other" },
    ],
  },
  {
    type: "single",
    field: "technicalLevel",
    question: "How technical are you?",
    helper: "We'll match the depth of explanations to your comfort level.",
    options: [
      { value: "beginner", label: "Beginner" },
      { value: "intermediate", label: "Intermediate" },
      { value: "advanced", label: "Advanced" },
    ],
  },
  {
    type: "single",
    field: "primaryUseCase",
    question: "What do you mainly want to use Quantiliom for?",
    helper: "Your main goal shapes the questions we ask next.",
    options: [
      { value: "new_product_architecture", label: "Design architecture for a new product" },
      { value: "tech_stack_decision", label: "Choose the right tech stack" },
      { value: "cost_estimation", label: "Estimate technical cost" },
      { value: "documentation", label: "Generate technical documentation" },
      { value: "learning_system_design", label: "Learn system design" },
      { value: "other", label: "Other" },
    ],
  },
  {
    type: "single",
    field: "projectStage",
    question: "What stage is your project in?",
    helper: "So we know whether to plan, design, or refactor with you.",
    options: [
      { value: "idea", label: "Just an idea" },
      { value: "planning_mvp", label: "Planning an MVP" },
      { value: "already_building", label: "Already building" },
      { value: "scaling_or_refactoring", label: "Scaling or refactoring" },
      { value: "other", label: "Other" },
    ],
  },
  {
    type: "single",
    field: "teamSize",
    question: "How many people are in your team?",
    helper: "We tailor collaboration suggestions to your team shape.",
    options: [
      { value: "solo", label: "Just me" },
      { value: "two_to_five", label: "2–5 people" },
      { value: "six_to_fifteen", label: "6–15 people" },
      { value: "sixteen_plus", label: "16+ people" },
    ],
  },
  {
    type: "pricing",
    field: "planPreference",
    question: "Pick the plan that fits today.",
    helper:
      "We just save your preference for now — you can stay on Free as long as you want and switch anytime.",
    options: [
      {
        value: "free",
        tier: "Free forever",
        name: "Starter",
        monthlyPrice: "$0",
        annualPrice: "$0",
        period: "/ month",
        tagline:
          "Explore the platform and get real architecture value on your first project. No credit card required.",
        features: [
          { ok: true, text: "1 project workspace" },
          { ok: true, text: "Full architecture overview" },
          { ok: true, text: "Interactive system diagram" },
          { ok: true, text: "Tech stack recommendation" },
          { ok: true, text: "5 chatbot revisions per project" },
          { ok: false, text: "PDF documentation export" },
          { ok: false, text: "Cost optimization reports" },
          { ok: false, text: "Architecture alternatives" },
        ],
      },
      {
        value: "interested_pro",
        tier: "Most popular",
        name: "Pro",
        monthlyPrice: "$29",
        annualPrice: "$23",
        annualOrig: "$29",
        annualNote: "Billed $276 / year — save $72",
        period: "/ month",
        pro: true,
        tagline:
          "Full access to the architecture workspace for solo founders and developers who need the complete picture.",
        features: [
          { ok: true, text: "Unlimited projects" },
          { ok: true, text: "Full architecture generation" },
          { ok: true, text: "2–3 architecture alternatives" },
          { ok: true, text: "Unlimited chatbot revisions" },
          { ok: true, text: "PDF documentation export" },
          { ok: true, text: "Cost optimization reports" },
          { ok: true, text: "Security recommendations" },
          { ok: true, text: "Full tech stack comparisons" },
        ],
      },
      {
        value: "team_evaluation",
        tier: "For teams",
        name: "Team",
        monthlyPrice: "$79",
        annualPrice: "$63",
        annualOrig: "$79",
        annualNote: "Billed $756 / year — save $192",
        period: "/ month",
        tagline:
          "Collaborate on architecture decisions across your entire team in shared, versioned workspaces.",
        features: [
          { ok: true, text: "Everything in Pro" },
          { ok: true, text: "Up to 5 team members" },
          { ok: true, text: "Shared project workspaces" },
          { ok: true, text: "Collaborative revision history" },
          { ok: true, text: "Team comments & annotations" },
          { ok: true, text: "Organization workspace" },
          { ok: true, text: "Priority support" },
          { ok: false, text: "Enterprise controls (coming soon)" },
        ],
      },
    ],
  },
];

const REQUIRED_FIELDS: (keyof OnboardingAnswers)[] = [
  "role",
  "technicalLevel",
  "primaryUseCase",
  "projectStage",
  "teamSize",
  "detailLevel",
  "preferredLanguage",
  "planPreference",
];

function initialAnswers(): Partial<OnboardingAnswers> {
  const lang =
    (navigator.language || "en").toLowerCase().startsWith("tr") ? "tr" : "en";
  return { preferredLanguage: lang };
}

export default function OnboardingWizard({ onComplete }: Props) {
  const [answers, setAnswers] = useState<Partial<OnboardingAnswers>>(initialAnswers);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState<"next" | "back">("next");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");

  const slide = SLIDES[currentSlide];
  const isLast = currentSlide === SLIDES.length - 1;

  const allAnswered = useMemo(
    () => REQUIRED_FIELDS.every((f) => Boolean(answers[f])),
    [answers]
  );

  const slideComplete = Boolean(answers[slide.field]);

  const setAnswer = useCallback((field: keyof OnboardingAnswers, value: string) => {
    setAnswers((prev) => {
      const next: Partial<OnboardingAnswers> = { ...prev, [field]: value };
      if (field === "technicalLevel") {
        next.detailLevel = TECHNICAL_TO_DETAIL[value] || "balanced";
      }
      return next;
    });
  }, []);

  function goBack() {
    if (submitting || currentSlide === 0) return;
    setError(null);
    setDirection("back");
    setCurrentSlide((s) => s - 1);
  }

  async function goNext() {
    if (submitting) return;
    if (!slideComplete) return;
    setError(null);
    if (!isLast) {
      setDirection("next");
      setCurrentSlide((s) => s + 1);
      return;
    }
    await submit();
  }

  async function submit() {
    if (!allAnswered) {
      const missing = REQUIRED_FIELDS.filter((f) => !answers[f]);
      setError(`Please answer: ${missing.join(", ")}`);
      return;
    }
    if (!auth?.currentUser) {
      setError("Session expired. Please sign in again.");
      return;
    }
    setSubmitting(true);
    setSuccess(null);
    try {
      const idToken = await auth.currentUser.getIdToken();
      const payload = answers as OnboardingAnswers;
      const updated = await postOnboarding(idToken, payload);
      setSuccess("Registration completed. Opening your dashboard…");
      window.setTimeout(() => onComplete(updated), 900);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not save your answers. Please try again.";
      setError(msg);
      setSubmitting(false);
    }
  }

  return (
    <div className="wiz-page" role="main">
      <div className="bg-grid" aria-hidden="true" />
      <div className="bg-glow" aria-hidden="true" />

      <header className="wiz-topbar">
        <div className="wiz-brand">
          <div className="wiz-brand-mark" aria-hidden="true">
            Q
          </div>
          <div className="wiz-brand-name">Quantiliom AI</div>
        </div>
        <div className="topbar-progress" aria-label="Onboarding progress">
          {SLIDES.map((_, idx) => (
            <span
              key={idx}
              className={
                "seg" +
                (idx === currentSlide ? " is-active" : "") +
                (idx < currentSlide ? " is-done" : "")
              }
            />
          ))}
        </div>
      </header>

      <main className="wiz">
        <div className="wiz-inner">
          <section className="wiz-card">
            <div className="wiz-caption">
              <span className="ix">
                <span className="cur">{String(currentSlide + 1).padStart(2, "0")}</span>
                <span className="sep">/</span>
                <span>{String(SLIDES.length).padStart(2, "0")}</span>
              </span>
              <span className="lbl">{STEP_LABELS[currentSlide]}</span>
            </div>

            <SlideBody
              key={currentSlide}
              slide={slide}
              direction={direction}
              answers={answers}
              setAnswer={setAnswer}
              billingPeriod={billingPeriod}
              setBillingPeriod={setBillingPeriod}
            />

            <div className="wiz-foot">
              <button
                type="button"
                className="wiz-btn wiz-btn-ghost"
                onClick={goBack}
                disabled={submitting || currentSlide === 0}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12" />
                  <polyline points="12 19 5 12 12 5" />
                </svg>
                Back
              </button>
              <button
                type="button"
                className="wiz-btn wiz-btn-dark"
                onClick={goNext}
                disabled={submitting || (isLast ? !allAnswered : !slideComplete)}
              >
                <span>{submitting ? "Submitting…" : isLast ? "Finish setup" : "Next"}</span>
                {!submitting ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                ) : null}
              </button>
            </div>

            {error ? (
              <div className="auth-toast auth-toast-error" role="alert" style={{ marginTop: 18 }}>
                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                <span>{error}</span>
              </div>
            ) : null}
            {success ? (
              <div className="auth-toast auth-toast-success" role="status" style={{ marginTop: 18 }}>
                <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
                <span>{success}</span>
              </div>
            ) : null}
          </section>
        </div>
      </main>
    </div>
  );
}

function SlideBody({
  slide,
  direction,
  answers,
  setAnswer,
  billingPeriod,
  setBillingPeriod,
}: {
  slide: Slide;
  direction: "next" | "back";
  answers: Partial<OnboardingAnswers>;
  setAnswer: (field: keyof OnboardingAnswers, value: string) => void;
  billingPeriod: "monthly" | "annual";
  setBillingPeriod: (p: "monthly" | "annual") => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Force re-trigger of CSS animations when slide changes.
  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.classList.remove("dir-next", "dir-back");
    void containerRef.current.offsetHeight;
    containerRef.current.classList.add(direction === "back" ? "dir-back" : "dir-next");
  }, [direction, slide]);

  if (slide.type === "single") {
    const value = answers[slide.field] ?? null;
    return (
      <div className="wiz-slide" ref={containerRef}>
        <h2 className="q">{slide.question}</h2>
        <p className="q-helper">{slide.helper}</p>
        <div className="opts" role="radiogroup" aria-label={slide.question}>
          {slide.options.map((opt) => {
            const selected = value === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={selected}
                className={"opt" + (selected ? " is-selected" : "")}
                onClick={() => setAnswer(slide.field, opt.value)}
              >
                <span className="opt-check" aria-hidden="true" />
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const value = answers.planPreference ?? null;
  return (
    <div className="wiz-slide" ref={containerRef}>
      <h2 className="q">{slide.question}</h2>
      <p className="q-helper">{slide.helper}</p>
      <div className="billing-wrap">
        <div className="billing-toggle">
          {(["monthly", "annual"] as const).map((p) => (
            <button
              key={p}
              type="button"
              className={"billing-opt" + (p === billingPeriod ? " active" : "")}
              onClick={() => setBillingPeriod(p)}
            >
              {p === "monthly" ? "Monthly" : "Annual"}
            </button>
          ))}
        </div>
        <span className={"save-badge" + (billingPeriod === "annual" ? " visible" : "")}>Save 20%</span>
      </div>
      <div className="plans">
        {slide.options.map((plan) => {
          const selected = value === plan.value;
          const isAnnual = billingPeriod === "annual";
          return (
            <button
              key={plan.value}
              type="button"
              className={"plan" + (plan.pro ? " pro" : "") + (selected ? " is-selected" : "")}
              aria-pressed={selected}
              onClick={() => setAnswer("planPreference", plan.value)}
            >
              <span className="plan-tier">{plan.tier}</span>
              <div className="plan-name">{plan.name}</div>
              <div className="plan-price-row">
                <span className="plan-price-val">
                  {isAnnual ? plan.annualPrice : plan.monthlyPrice}
                </span>
                <span className="plan-price-per">{plan.period}</span>
                <span
                  className={
                    "plan-price-orig" + (isAnnual && plan.annualOrig ? " show" : "")
                  }
                >
                  {isAnnual && plan.annualOrig ? plan.annualOrig : ""}
                </span>
              </div>
              <p className="plan-tagline">{plan.tagline}</p>
              <div className="plan-sep" />
              <ul className="plan-feats">
                {plan.features.map((f) => (
                  <li key={f.text} className="plan-feat">
                    <span
                      className={"feat-icon " + (f.ok ? "y" : "n")}
                      aria-hidden="true"
                    >
                      {f.ok ? "✓" : "✗"}
                    </span>
                    <span>{f.text}</span>
                  </li>
                ))}
              </ul>
              <div className="plan-annual-note">
                {isAnnual && plan.annualNote ? plan.annualNote : " "}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
