# AGENTS.md — Quantiliom AI Dashboard

Operational notes for future coding agents working in this repo. Describes
what currently exists and the rules that protect it. Read before editing.

## 1. Purpose of this repository

This repo is the **separate Quantiliom AI dashboard** — the authenticated
product surface that the user lands on after signing in via the marketing
website. It is a sibling to the existing two repos and intentionally
isolated from both:

- `quantiliom-ai-website` — public marketing pages + login/onboarding
  (port 5500).
- `quantiliom-ai-backend` — Express + Firebase Admin + Prisma + PostgreSQL
  + Resend (port 5050).

This dashboard is **frontend only**. It runs on port **5173** via Vite.

## 2. Current tech stack

- **Vite** 5 (`vite@^5.3.1`).
- **React** 18 (`react@^18.3.1`, `react-dom@^18.3.1`).
- **TypeScript** 5 (`typescript@^5.4.5`, `@types/react`, `@types/react-dom`).
- **`@vitejs/plugin-react`** — JSX + Fast Refresh.
- **Firebase Web SDK** (`firebase@^10.13.2`) — **Auth only.** Used by the
  hard auth gate in `src/components/AuthGate.tsx`. Imports are limited to
  `firebase/app` (`initializeApp`) and `firebase/auth`
  (`getAuth`, `onAuthStateChanged`, `signOut`). Do not add Firestore,
  Storage, Functions, Analytics, Realtime Database, App Check, or any
  other Firebase product without an explicit task.
- **Plain CSS** with design tokens in `src/styles/tokens.css`. No CSS-in-JS,
  no Tailwind, no UI kit, no icon library, no router.

If you add a dependency, add it for a good reason. Inline-SVG icons and
plain CSS were a deliberate choice to keep the dashboard light, brand
faithful, and easy to read.

## 3. Hard constraints — do not do these

These rules exist to keep this repo doing one thing well.

- **No Firebase Admin SDK** here. Admin credentials belong only in
  `quantiliom-ai-backend`.
- **No Prisma**, no `@prisma/client`, no migrations, no database access of
  any kind. The dashboard has no DB.
- **No backend routes** here. Express, request handlers, server-side logic
  — none of it lives in this repo. If something needs to live on the
  server, add it in `quantiliom-ai-backend` and call it over HTTP from here.
- **No secrets.** No API keys, no service-account JSON, no Resend keys, no
  `.env` values with real credentials. The `.env.example` file is
  intentionally empty for now. Any future `VITE_*` value must be either
  public (and clearly documented as such) or stay out of this repo.
- **No billing or payment integration** yet. Stripe, Paddle, plan upgrades,
  card capture — out of scope.
- **No AI generation endpoints** yet. The AI architecture-brief panel must
  not make real model calls. It currently shows a polished
  "coming soon" notice when submitted, and that is the contract for this
  milestone.
- **No project CRUD** yet. The "Recent architecture drafts" list, next
  steps, and readiness checklist are static mock UI. Do not persist them.
- **No sign-in or sign-up UI on the dashboard.** The auth gate is hard
  redirect-only: when no Firebase session exists on `localhost:5173`,
  visitors are sent to `http://localhost:5500/login.html`. Sign-in and
  sign-up happen exclusively on the website. Do not add
  `signInWithPopup`, `signInWithEmailAndPassword`,
  `createUserWithEmailAndPassword`, OAuth providers, or any other sign-in
  primitive to this repo without an explicit task.
- **No backend HTTP calls yet.** The Topbar's `plan` is hardcoded to
  "Free Plan". Wiring it to `GET /api/users/me` requires:
  (a) an explicit task,
  (b) adding `http://localhost:5173` to the backend's CORS allowlist
  (currently only `:5500` is allowed),
  (c) safe handling of the ID token (never logged, never put in URLs,
  never stored manually in `localStorage`).
- **Cross-origin auth handoff is unsolved.** A user signed in on the
  website does NOT get an automatic session on this origin (Firebase
  IndexedDB is origin-scoped). The current gate trades reachability for
  enforcement — that is the deliberate posture. Future options listed in
  README "Auth gate". Do not introduce ad-hoc workarounds (URL-fragment
  ID tokens, manual `localStorage`, custom session cookies in
  `localStorage`) — those were ruled out for a reason.

## 3a. Auth gate contract

- `src/lib/firebase.ts` initializes Firebase Auth once. It exports `auth`,
  `onAuthStateChanged`, `signOut`, and the `User` type. Nothing else.
- `src/lib/firebase-config.ts` holds the public Web config and is
  **gitignored** (see `.gitignore`). The committed template is
  `src/lib/firebase-config.example.ts`. Always use the SAME Firebase
  project as `quantiliom-ai-website` — they share a user pool.
- `src/components/AuthGate.tsx` is the single source of truth for who is
  allowed to see the shell. It renders `<Splash>` while resolving and
  while redirecting, and renders the children only after a real Firebase
  user is present on this origin.
- The Topbar's "Sign out" calls `signOut(auth)` and then immediately
  `window.location.replace(WEBSITE_URL/login.html)` so users never see a
  flash of the dashboard between the sign-out and the gate's redirect.
- `src/lib/config.ts` holds the public website URL (`WEBSITE_URL`). The
  redirect destination is centralized — do not hardcode
  `http://localhost:5500/login.html` elsewhere.

## 4. When you do call the backend (later)

When integration ships, follow these rules:

- Use HTTP only. Treat the backend as a remote service.
- Read `VITE_BACKEND_URL` (or similar) from `import.meta.env`. Default to
  `http://localhost:5050` for local development. Document the variable in
  `.env.example`.
- **Do not** pass Firebase ID tokens through URL query parameters.
- **Do not** store ID tokens manually in `localStorage` or `sessionStorage`.
  If a token must be persisted on this origin, it should be obtained via
  the Firebase Web SDK on this origin, not handed to us by another origin.
- **Do not** log full ID tokens to the browser console (the website's
  `safeUserSummary` pattern is the right shape).
- Network errors must never throw past the call site — surface a user-safe
  message in the UI.

## 5. Visual language

The dashboard must feel like the same product as
`quantiliom-ai-website`. The design tokens in `src/styles/tokens.css`
mirror the website's `theme.css` / `variables.css` / `DESIGN.md`:

- **Palette:** factory-black (`#020202`), factory-light-gray (`#eeeeee`),
  faded-silver (`#fafafa`), cool-gray (`#b8b3b0`), graphite (`#3d3a39`),
  ash-gray (`#a49d9a`), code-orange (`#ef6f2e`).
- **Typography:** Inter (sans) + JetBrains Mono (mono), matching what the
  website actually loads. The brand guide names Geist as the primary face
  but the live site uses the Inter substitute — we follow the live site.
- **Radii are small.** 4px for buttons, 6px for cards, 8–12px for elevated
  panels. Avoid soft, modern, 20px+ radii — they break the brand restraint.
- **Shadows are restrained.** No drop shadows on default state; only soft
  hover/focus elevation. No chromatic gradients beyond accent-orange usage.
- **Spacing scale is the 4px base.** Use the `--space-*` tokens.
- **Negative letter-spacing** on large headings (`--text-heading-lg`,
  `--text-display`) — this is a core brand characteristic.
- **Active states, hover states, and focus rings exist on every interactive
  element.** Do not ship a button without all three.

When adding new components: if you reach for a new color, a new radius, a
new shadow, or a new font weight, first check whether an existing token
already covers it. Add a token only if the design genuinely needs it.

## 6. Structure conventions

- One component per file under `src/components/`. Default-export the
  component. Co-locate small types in the file.
- Inline-SVG icons live in `src/components/icons.tsx`. Honor
  `currentColor`. Do not import an icon library.
- Page-level composition lives under `src/pages/`. The shell composition
  (sidebar / topbar / main) lives inside `<AuthGate>` in `App.tsx`.
- Cross-cutting client code lives in `src/lib/` (Firebase init, config,
  future API helpers).
- All CSS class names live in `src/styles/dashboard.css`. Do not use
  inline `style` for layout; small dynamic values like `width: ${n}%` on
  a progress bar are fine.

## 7. Mobile / responsive rules

- Desktop (≥901px): fixed left sidebar grid column + scrollable main.
- Below 901px: sidebar becomes a slide-in drawer toggled from the topbar
  menu button. A scrim sits behind the drawer and Esc closes it.
- The topbar account pill collapses to just the avatar at narrow widths.

## 8. Things to push back on

When asked to "just add X here," consider whether X belongs in
`quantiliom-ai-backend` or `quantiliom-ai-website` instead. Specifically
push back if asked to add any of:

- Server-side logic, database queries, or migration files.
- Firebase Admin credentials, service-account JSON, or any "service key."
- Stripe / billing logic.
- Email sending (welcome, password reset, marketing).
- Marketing pages — those belong in `quantiliom-ai-website`.

## 9. Acceptance bar for any PR here

- `npm run build` succeeds with no TypeScript errors.
- The UI still feels like the same product as the website (palette,
  typography, spacing, radii).
- No new secrets land in the repo.
- No new networking against the backend lands without an explicit task.
- Hover, focus, and active states still exist on every interactive
  element you touched.
