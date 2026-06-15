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
  createdAt: string | null;
  updatedAt: string | null;
  lastLoginAt: string | null;
};

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
