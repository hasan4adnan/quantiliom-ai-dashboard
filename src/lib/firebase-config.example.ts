/**
 * Copy this file to src/lib/firebase-config.ts and fill in the values from
 * Firebase Console → Project settings → Your apps → Web app → SDK setup.
 *
 * Use the SAME Firebase project as quantiliom-ai-website. The Web `apiKey`
 * is a public app identifier (not a secret), but src/lib/firebase-config.ts
 * stays gitignored for hygiene.
 *
 * Never put backend secrets (service-account JSON, Resend keys) here.
 */
export const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
  measurementId: "",
};
