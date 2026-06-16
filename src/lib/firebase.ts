/**
 * Firebase Web SDK init — Auth only. No Firestore, no Storage, no Analytics.
 *
 * Initialization is intentionally NON-FATAL: if `firebase-config.ts` is
 * missing required keys, `auth` is null and `initError` carries a
 * human-readable message. The AuthGate surfaces that message in the UI
 * instead of letting the app render as a blank page.
 *
 * Sign-in, sign-up, and onboarding all live in this repo now — the
 * website redirects users here for any authenticated experience. See
 * AGENTS.md for the full rule set.
 */
import { initializeApp } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
  OAuthProvider,
  type Auth,
  type User,
} from "firebase/auth";

import { firebaseConfig } from "./firebase-config";

const REQUIRED_KEYS = ["apiKey", "authDomain", "projectId", "appId"] as const;
const missing = REQUIRED_KEYS.filter((k) => !firebaseConfig[k]);

export const initError: string | null =
  missing.length > 0
    ? `Firebase Web config is missing required key(s): ${missing.join(
        ", "
      )}. Copy src/lib/firebase-config.example.ts to src/lib/firebase-config.ts and paste the SAME values that are in quantiliom-ai-website/src/firebase-config.js.`
    : null;

export const auth: Auth | null = initError
  ? null
  : getAuth(initializeApp(firebaseConfig));

if (initError) {
  console.error("[firebase] init skipped:", initError);
}

export {
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
  OAuthProvider,
};
export type { User };
