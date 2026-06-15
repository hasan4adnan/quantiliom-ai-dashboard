/**
 * Shared frontend config. Public values only — no secrets.
 *
 * BACKEND_URL is the Express service that verifies Firebase ID tokens and
 * persists user records. The dashboard calls /api/auth/verify after every
 * sign-in (upsert), /api/users/me to load the local user, and
 * /api/onboarding/complete from the wizard. The backend's CORS allowlist
 * must include http://localhost:5173 — see quantiliom-ai-backend/src/
 * server.js.
 *
 * WEBSITE_URL is where we send users when they click the "Back to home"
 * link from the login screen.
 */
export const BACKEND_URL = "http://localhost:5050";
export const WEBSITE_URL = "http://localhost:5500";
