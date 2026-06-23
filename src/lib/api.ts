/**
 * Backend HTTP wrappers. All requests are made from this origin
 * (http://localhost:5173) and require the backend's CORS allowlist to
 * include it.
 *
 * ID tokens are obtained via Firebase Web SDK on this origin and passed
 * in Authorization: Bearer headers. We never log them in full, never
 * persist them manually in localStorage, and never put them in URLs.
 */
import { BACKEND_URL } from "./config";

export type LocalUser = {
  id: string;
  firebaseUid: string;
  email: string;
  /**
   * Auto-generated public @-handle (e.g. "@hasan_42"). Assigned by the
   * backend on first sign-in; may be null for legacy rows that haven't
   * been refreshed via /api/auth/verify yet — UI should fall back to "—".
   */
  username: string | null;
  name: string | null;
  picture: string | null;
  provider: string | null;
  plan: string;
  planPreference: string | null;
  onboardingStatus: string;
  role: string | null;
  technicalLevel: string | null;
  primaryUseCase: string | null;
  projectStage: string | null;
  teamSize: string | null;
  detailLevel: string | null;
  preferredLanguage: string | null;
  onboardingCompletedAt: string | null;
  welcomeEmailSentAt: string | null;
  /**
   * Set the moment we trust the user owns this email address. For
   * Google/social sign-ins this is stamped on first /api/auth/verify
   * (the provider already verified the address). For raw email/password
   * sign-ups it is null until the user types the 6-digit code we mail
   * them via POST /api/auth/send-verification-code +
   * POST /api/auth/verify-email-code.
   */
  emailVerifiedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  lastLoginAt: string | null;
};

export type SendVerificationCodeResult =
  | { alreadyVerified: true }
  | {
      alreadyVerified: false;
      expiresAt: string;
      cooldownMs: number;
      codeLength: number;
    };

export type SendVerificationCodeError = {
  message: string;
  /** Present when the backend returned 429 with a cooldown. */
  retryAfterMs?: number;
};

export class VerificationApiError extends Error {
  status: number;
  data: Record<string, unknown>;
  constructor(message: string, status: number, data: Record<string, unknown>) {
    super(message);
    this.name = "VerificationApiError";
    this.status = status;
    this.data = data;
  }
}

export type OnboardingAnswers = {
  role: string;
  technicalLevel: string;
  primaryUseCase: string;
  projectStage: string;
  teamSize: string;
  detailLevel: string;
  preferredLanguage: string;
  planPreference: string;
};

async function readJsonSafe(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch (_) {
    return {};
  }
}

function bubbleError(data: Record<string, unknown>, res: Response): string {
  const err = data.error;
  if (typeof err === "string" && err) return err;
  return `Backend returned HTTP ${res.status}`;
}

/**
 * POST /api/auth/verify
 *
 * Upserts the local User row by firebaseUid. New users come back with
 * onboardingStatus="not_started"; returning users have it preserved.
 * Always call this immediately after a successful Firebase sign-in.
 */
export async function postVerify(idToken: string): Promise<LocalUser> {
  const res = await fetch(`${BACKEND_URL}/api/auth/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  const data = await readJsonSafe(res);
  if (!res.ok || !data.success || !data.user) {
    throw new Error(bubbleError(data, res));
  }
  return data.user as LocalUser;
}

/**
 * GET /api/users/me — refreshes the local user record using the current
 * ID token. Useful after onboarding to confirm server state.
 */
export async function fetchMe(idToken: string): Promise<LocalUser> {
  const res = await fetch(`${BACKEND_URL}/api/users/me`, {
    method: "GET",
    headers: { Authorization: `Bearer ${idToken}` },
  });
  const data = await readJsonSafe(res);
  if (!res.ok || !data.success || !data.user) {
    throw new Error(bubbleError(data, res));
  }
  return data.user as LocalUser;
}

/**
 * POST /api/onboarding/complete — submits the 8-field wizard answers.
 * Backend marks onboardingStatus="completed" and stamps
 * onboardingCompletedAt. `plan` stays "free"; `planPreference` is
 * recorded as intent only.
 */
export async function postOnboarding(
  idToken: string,
  payload: OnboardingAnswers
): Promise<LocalUser> {
  const res = await fetch(`${BACKEND_URL}/api/onboarding/complete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await readJsonSafe(res);
  if (!res.ok || !data.success || !data.user) {
    throw new Error(bubbleError(data, res));
  }
  return data.user as LocalUser;
}

/**
 * POST /api/auth/send-verification-code
 *
 * Asks the backend to mint a fresh 6-digit code and email it to the
 * user's address. Idempotent from the caller's perspective — each
 * successful call replaces whatever code was outstanding. Rate-limited
 * server-side at one per 60s; the backend surfaces that as HTTP 429 with
 * a retryAfterMs field, which we expose as VerificationApiError.data.
 */
export async function postSendVerificationCode(
  idToken: string
): Promise<SendVerificationCodeResult> {
  const res = await fetch(`${BACKEND_URL}/api/auth/send-verification-code`, {
    method: "POST",
    headers: { Authorization: `Bearer ${idToken}` },
  });
  const data = await readJsonSafe(res);
  if (!res.ok || !data.success) {
    throw new VerificationApiError(bubbleError(data, res), res.status, data);
  }
  if (data.alreadyVerified) return { alreadyVerified: true };
  return {
    alreadyVerified: false,
    expiresAt: String(data.expiresAt ?? ""),
    cooldownMs: typeof data.cooldownMs === "number" ? data.cooldownMs : 60_000,
    codeLength: typeof data.codeLength === "number" ? data.codeLength : 6,
  };
}

/**
 * POST /api/auth/verify-email-code
 *
 * Confirms the 6-digit code, stamps emailVerifiedAt, returns the fresh
 * user row (so callers can transition straight to the next state without
 * a second /me round-trip). Throws VerificationApiError on any non-2xx
 * so the caller can branch on status (400 wrong code, 410 expired, 429
 * locked out).
 */
export async function postVerifyEmailCode(
  idToken: string,
  code: string
): Promise<LocalUser> {
  const res = await fetch(`${BACKEND_URL}/api/auth/verify-email-code`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ code }),
  });
  const data = await readJsonSafe(res);
  if (!res.ok || !data.success || !data.user) {
    throw new VerificationApiError(bubbleError(data, res), res.status, data);
  }
  return data.user as LocalUser;
}

/**
 * DELETE /api/users/me — permanently delete the caller's account.
 *
 * The backend deletes the local Postgres row first (releasing the email
 * unique constraint) and then the Firebase Auth user. After this call
 * succeeds, the current ID token is effectively useless — sign out
 * immediately, and AuthGate will fall back to the LoginScreen.
 */
export async function deleteMe(idToken: string): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/api/users/me`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${idToken}` },
  });
  const data = await readJsonSafe(res);
  if (!res.ok || !data.success) {
    throw new Error(bubbleError(data, res));
  }
}

/**
 * Returns a short, safe summary suitable for console.log. Never includes
 * the ID token, never the full user object (which may contain stale
 * fields).
 */
export function safeUserSummary(u: LocalUser) {
  return {
    id: u.id,
    email: u.email,
    plan: u.plan,
    onboardingStatus: u.onboardingStatus,
  };
}

/* ------------------------------------------------------------------ */
/* AI job API (Step 9a — types + wrappers only, no UI wiring)         */
/* ------------------------------------------------------------------ */

export type AiJobStatus = "queued" | "running" | "succeeded" | "failed";

export type AiJobSummary = {
  id: string;
  status: AiJobStatus;
  description: string | null;
  errorCode: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  /**
   * Server-suggested polling URL. Informational only — the client wrappers
   * call by job id against BACKEND_URL so a misconfigured backend can't
   * redirect us off-origin.
   */
  pollUrl: string;
};

export type AiJobDetail = AiJobSummary & {
  result: unknown | null;
  errorMessage: string | null;
};

export type CreateAiJobInput = {
  description?: string;
  requirements: Record<string, unknown>;
};

export type CreateAiJobResponse = {
  success: true;
  job: AiJobSummary;
};

export type GetAiJobResponse = {
  success: true;
  job: AiJobDetail;
};

export type ListAiJobsOptions = {
  limit?: number;
  status?: AiJobStatus;
};

export type ListAiJobsResponse = {
  success: true;
  jobs: AiJobSummary[];
  count: number;
};

/**
 * POST /api/jobs — create + enqueue an AI architecture job.
 *
 * Returns the summary (no result yet). Caller should then poll
 * getAiJob(idToken, summary.id) until status is "succeeded" or "failed".
 */
export async function createAiJob(
  idToken: string,
  input: CreateAiJobInput
): Promise<AiJobSummary> {
  const res = await fetch(`${BACKEND_URL}/api/jobs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(input),
  });
  const data = await readJsonSafe(res);
  if (!res.ok || !data.success || !data.job) {
    throw new Error(bubbleError(data, res));
  }
  return data.job as AiJobSummary;
}

/**
 * GET /api/jobs/:id — fetch the latest snapshot of a single job. The
 * detail shape includes the result payload once the job has succeeded.
 */
export async function getAiJob(
  idToken: string,
  jobId: string
): Promise<AiJobDetail> {
  const res = await fetch(
    `${BACKEND_URL}/api/jobs/${encodeURIComponent(jobId)}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${idToken}` },
    }
  );
  const data = await readJsonSafe(res);
  if (!res.ok || !data.success || !data.job) {
    throw new Error(bubbleError(data, res));
  }
  return data.job as AiJobDetail;
}

/**
 * GET /api/jobs — list the caller's recent AI jobs. Server caps at
 * limit=50 and defaults to 20. Summaries omit the result payload by
 * design; call getAiJob for the full detail when needed.
 */
export async function listAiJobs(
  idToken: string,
  options?: ListAiJobsOptions
): Promise<AiJobSummary[]> {
  const params = new URLSearchParams();
  if (options?.limit !== undefined) {
    params.set("limit", String(options.limit));
  }
  if (options?.status !== undefined) {
    params.set("status", options.status);
  }
  const qs = params.toString();
  const url = qs ? `${BACKEND_URL}/api/jobs?${qs}` : `${BACKEND_URL}/api/jobs`;
  const res = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${idToken}` },
  });
  const data = await readJsonSafe(res);
  if (!res.ok || !data.success || !Array.isArray(data.jobs)) {
    throw new Error(bubbleError(data, res));
  }
  return data.jobs as AiJobSummary[];
}

/* ------------------------------------------------------------------ */
/* AI discovery job API (Step 9c — types + wrappers only, no UI wiring) */
/* ------------------------------------------------------------------ */

export type AiDiscoveryJobStatus = "queued" | "running" | "succeeded" | "failed";

export type RequirementAnalysis = {
  domain:
    | "saas"
    | "marketplace"
    | "chatbot"
    | "realtime_chat"
    | "ecommerce"
    | "other";
  confidence: number;
  detectedSignals: string[];
  missingCriticalInfo: string[];
  briefSummary: string;
};

export type AiQuestionCategory =
  | "scale"
  | "realtime"
  | "media"
  | "payment"
  | "mobile"
  | "notifications"
  | "admin"
  | "analytics"
  | "security"
  | "budget"
  | "priority"
  | "features"
  | "integrations"
  | "infrastructure"
  | "other";

export type AiQuestionType =
  | "single_select"
  | "multi_select"
  | "number"
  | "boolean"
  | "text";

export type AiQuestion = {
  id: string;
  category: AiQuestionCategory;
  text: string;
  helpText?: string;
  type: AiQuestionType;
  options?: string[];
  required: boolean;
};

export type AiDiscoveryJobSummary = {
  id: string;
  status: AiDiscoveryJobStatus;
  description: string;
  errorCode: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  /**
   * Server-suggested polling URL. Informational only — the wrappers call
   * by job id against BACKEND_URL so a misconfigured backend can't redirect
   * us off-origin.
   */
  pollUrl: string;
};

export type AiDiscoveryJobDetail = AiDiscoveryJobSummary & {
  analysis: RequirementAnalysis | null;
  questions: AiQuestion[] | null;
  errorMessage: string | null;
};

export type CreateAiDiscoveryJobInput = {
  description: string;
};

export type CreateAiDiscoveryJobResponse = {
  success: true;
  job: AiDiscoveryJobSummary;
};

export type GetAiDiscoveryJobResponse = {
  success: true;
  job: AiDiscoveryJobDetail;
};

export type ListAiDiscoveryJobsOptions = {
  limit?: number;
  status?: AiDiscoveryJobStatus;
};

export type ListAiDiscoveryJobsResponse = {
  success: true;
  jobs: AiDiscoveryJobSummary[];
  count: number;
};

/**
 * POST /api/discovery — create + enqueue an AI discovery job that turns a
 * rough description into a requirement analysis + adaptive follow-up
 * questions. Returns the summary (no analysis/questions yet). Caller
 * should then poll getAiDiscoveryJob(idToken, summary.id) until status is
 * "succeeded" or "failed".
 */
export async function createAiDiscoveryJob(
  idToken: string,
  input: CreateAiDiscoveryJobInput
): Promise<CreateAiDiscoveryJobResponse> {
  const res = await fetch(`${BACKEND_URL}/api/discovery`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(input),
  });
  const data = await readJsonSafe(res);
  if (!res.ok || !data.success || !data.job) {
    throw new Error(bubbleError(data, res));
  }
  return {
    success: true,
    job: data.job as AiDiscoveryJobSummary,
  };
}

/**
 * GET /api/discovery/:id — fetch the latest snapshot of a single discovery
 * job. The detail shape includes the analysis + questions payload once the
 * job has succeeded.
 */
export async function getAiDiscoveryJob(
  idToken: string,
  jobId: string
): Promise<GetAiDiscoveryJobResponse> {
  const res = await fetch(
    `${BACKEND_URL}/api/discovery/${encodeURIComponent(jobId)}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${idToken}` },
    }
  );
  const data = await readJsonSafe(res);
  if (!res.ok || !data.success || !data.job) {
    throw new Error(bubbleError(data, res));
  }
  return {
    success: true,
    job: data.job as AiDiscoveryJobDetail,
  };
}

/**
 * GET /api/discovery — list the caller's recent discovery jobs. Server
 * caps at limit=50 and defaults to 20. Summaries omit the analysis +
 * questions payload by design; call getAiDiscoveryJob for the full detail
 * when needed.
 */
export async function listAiDiscoveryJobs(
  idToken: string,
  options?: ListAiDiscoveryJobsOptions
): Promise<ListAiDiscoveryJobsResponse> {
  const params = new URLSearchParams();
  if (options?.limit !== undefined) {
    params.set("limit", String(options.limit));
  }
  if (options?.status !== undefined) {
    params.set("status", options.status);
  }
  const qs = params.toString();
  const url = qs
    ? `${BACKEND_URL}/api/discovery?${qs}`
    : `${BACKEND_URL}/api/discovery`;
  const res = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${idToken}` },
  });
  const data = await readJsonSafe(res);
  if (!res.ok || !data.success || !Array.isArray(data.jobs)) {
    throw new Error(bubbleError(data, res));
  }
  return {
    success: true,
    jobs: data.jobs as AiDiscoveryJobSummary[],
    count: typeof data.count === "number" ? data.count : data.jobs.length,
  };
}

/* ------------------------------------------------------------------ */
/* AI requirements job API (Step 9f-5 — types + wrappers only, no UI  */
/* wiring).                                                            */
/* ------------------------------------------------------------------ */

export type AiRequirementsJobStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed";

/**
 * Permissive answer-value union. Matches the backend Answer schema
 * (src/engine/schemas/answers.ts) and what DiscoveryQuestionnaire stores
 * locally per question type:
 *   single_select → string
 *   multi_select  → string[]
 *   number        → number
 *   boolean       → boolean
 *   text          → string
 *   skipped       → null
 */
export type AiAnswerValue = string | string[] | number | boolean | null;

export type AiAnswer = {
  questionId: string;
  value: AiAnswerValue;
};

export type AiRequirementsJobSummary = {
  id: string;
  aiDiscoveryJobId: string;
  status: AiRequirementsJobStatus;
  errorCode: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  /**
   * Server-suggested polling URL. Informational only — the wrappers call
   * by job id against BACKEND_URL so a misconfigured backend can't
   * redirect us off-origin.
   */
  pollUrl: string;
};

export type AiRequirementsJobDetail = AiRequirementsJobSummary & {
  /**
   * Answers payload the dashboard submitted. The backend serializer
   * returns whatever shape was stored in Postgres; typed permissively
   * so consumers can opt into the `AiAnswer[]` narrow when they know
   * they wrote it.
   */
  answers: AiAnswer[] | unknown;
  requirements: unknown | null;
  errorMessage: string | null;
};

export type CreateAiRequirementsJobInput = {
  answers: AiAnswer[];
};

export type CreateAiRequirementsJobResponse = {
  success: true;
  job: AiRequirementsJobSummary;
};

export type GetAiRequirementsJobResponse = {
  success: true;
  job: AiRequirementsJobDetail;
};

export type ListAiRequirementsJobsOptions = {
  limit?: number;
  status?: AiRequirementsJobStatus;
  discoveryId?: string;
};

export type ListAiRequirementsJobsResponse = {
  success: true;
  jobs: AiRequirementsJobSummary[];
  count: number;
};

/**
 * POST /api/discovery/:discoveryId/requirements — create + enqueue an AI
 * requirements job that turns discovery answers into normalized
 * Requirements JSON. Returns the summary (no requirements payload yet).
 * Caller should then poll getAiRequirementsJob(idToken, summary.id)
 * until status is "succeeded" or "failed". Once succeeded, the dashboard
 * can take detail.requirements and POST it to /api/jobs to start an
 * architecture run.
 */
export async function createAiRequirementsJob(
  idToken: string,
  discoveryId: string,
  input: CreateAiRequirementsJobInput
): Promise<CreateAiRequirementsJobResponse> {
  const res = await fetch(
    `${BACKEND_URL}/api/discovery/${encodeURIComponent(
      discoveryId
    )}/requirements`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(input),
    }
  );
  const data = await readJsonSafe(res);
  if (!res.ok || !data.success || !data.job) {
    throw new Error(bubbleError(data, res));
  }
  return {
    success: true,
    job: data.job as AiRequirementsJobSummary,
  };
}

/**
 * GET /api/requirements/:id — fetch the latest snapshot of a single
 * requirements job. The detail shape includes the answers payload the
 * dashboard submitted and the normalized requirements payload once the
 * worker has succeeded.
 */
export async function getAiRequirementsJob(
  idToken: string,
  jobId: string
): Promise<GetAiRequirementsJobResponse> {
  const res = await fetch(
    `${BACKEND_URL}/api/requirements/${encodeURIComponent(jobId)}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${idToken}` },
    }
  );
  const data = await readJsonSafe(res);
  if (!res.ok || !data.success || !data.job) {
    throw new Error(bubbleError(data, res));
  }
  return {
    success: true,
    job: data.job as AiRequirementsJobDetail,
  };
}

/**
 * GET /api/requirements — list the caller's recent requirements jobs.
 * Server caps at limit=50 and defaults to 20. Summaries omit the
 * answers + requirements + errorMessage payloads by design; call
 * getAiRequirementsJob for the full detail when needed.
 */
export async function listAiRequirementsJobs(
  idToken: string,
  options?: ListAiRequirementsJobsOptions
): Promise<ListAiRequirementsJobsResponse> {
  const params = new URLSearchParams();
  if (options?.limit !== undefined) {
    params.set("limit", String(options.limit));
  }
  if (options?.status !== undefined) {
    params.set("status", options.status);
  }
  if (options?.discoveryId !== undefined) {
    params.set("discoveryId", options.discoveryId);
  }
  const qs = params.toString();
  const url = qs
    ? `${BACKEND_URL}/api/requirements?${qs}`
    : `${BACKEND_URL}/api/requirements`;
  const res = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${idToken}` },
  });
  const data = await readJsonSafe(res);
  if (!res.ok || !data.success || !Array.isArray(data.jobs)) {
    throw new Error(bubbleError(data, res));
  }
  return {
    success: true,
    jobs: data.jobs as AiRequirementsJobSummary[],
    count: typeof data.count === "number" ? data.count : data.jobs.length,
  };
}
