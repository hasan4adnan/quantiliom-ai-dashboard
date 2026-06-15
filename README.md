# Quantiliom AI — Dashboard

The authenticated dashboard for Quantiliom AI. **Frontend only** (Vite +
React + TypeScript). Lives in its own repository to keep concerns clean.

This milestone ships the **dashboard home page shell**: app layout
(sidebar + topbar + main scroll area), the AI architecture-brief input
panel, and a few mock content cards. No real AI calls and no backend
integration yet.

## Stack

- [Vite](https://vitejs.dev/) 5
- React 18
- TypeScript 5
- Plain CSS (design tokens in `src/styles/tokens.css`)
- No UI framework, no icon library, no router (single page for now)

## Local setup

```bash
cd /Users/hasan/Desktop/quantiliom-ai-dashboard
npm install
cp src/lib/firebase-config.example.ts src/lib/firebase-config.ts
# → open src/lib/firebase-config.ts and paste the SAME values used by
#   quantiliom-ai-website/src/firebase-config.js (Firebase Web SDK config).
npm run dev
```

Open <http://localhost:5173>. Unauthenticated visitors are immediately
redirected to <http://localhost:5500/login.html> — see **Auth gate** below.

`npm run dev` starts Vite with `server.port = 5173` (see `vite.config.ts`).
If port 5173 is busy Vite will pick the next free one and log it — re-enable
`strictPort` in the config if exact-port-or-bust is required.

### Build

```bash
npm run build      # type-check + vite build → dist/
npm run preview    # serve the built bundle on :5173
```

## Relationship to the other Quantiliom repos

| Repo | Path | Role | Port |
| ---- | ---- | ---- | ---- |
| Backend | `quantiliom-ai-backend` | Express + Firebase Admin + Prisma + PostgreSQL + Resend | 5050 |
| Website | `quantiliom-ai-website` | Static marketing site + login/onboarding | 5500 |
| **Dashboard** *(this repo)* | `quantiliom-ai-dashboard` | Authenticated app shell | **5173** |

For now the three live on three different local origins. The website's
post-login flow redirects the browser to <http://localhost:5173> after a
successful sign-in (existing onboarded user) or after the onboarding wizard
completes — see `quantiliom-ai-website/src/config.js` (`DASHBOARD_URL`) and
the handlers in `src/auth.js` / `src/registration.js`.

## Project layout

```
quantiliom-ai-dashboard/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── .env.example
├── .gitignore
├── README.md
├── AGENTS.md
├── public/
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── vite-env.d.ts
    ├── styles/
    │   ├── tokens.css        # Design tokens mirroring the website
    │   ├── globals.css       # Reset + base typography + focus styles
    │   └── dashboard.css     # Layout + component styles
    ├── components/
    │   ├── Sidebar.tsx
    │   ├── Topbar.tsx
    │   ├── AiInputPanel.tsx
    │   ├── DashboardCard.tsx
    │   └── icons.tsx         # Inline SVG icon set
    └── pages/
        └── DashboardHome.tsx
```

## Auth gate

The dashboard is gated by Firebase Auth on this origin. `src/components/
AuthGate.tsx` subscribes to `onAuthStateChanged` and:

1. While the Firebase SDK resolves the persisted session → shows a splash.
2. If no user is signed in on `http://localhost:5173` → `window.location.
   replace("http://localhost:5500/login.html")`. There is no sign-in UI on
   the dashboard — sign-in and sign-up happen exclusively on the website.
3. If a user is signed in → renders the dashboard shell. The Topbar reads
   `user.displayName` / `user.email` directly from Firebase. The account
   dropdown has a "Sign out" item that calls `signOut(auth)` and bounces
   back to the website login.

### ⚠ Cross-origin redirect loop (current trade-off)

Firebase Auth state is stored in IndexedDB scoped to the origin. A user
who signs in on `localhost:5500` does **not** automatically get a session
on `localhost:5173` — they're different origins. With the hard-redirect
gate enabled, the practical flow today is:

1. User signs in on the website.
2. The website redirects to the dashboard.
3. The dashboard sees no session on this origin → redirects back to the
   website login.
4. The user is already signed in on the website but the dashboard is
   still unreachable.

This is the intentional cost of the current milestone. To make the
dashboard actually reachable, one of these has to land next:

- **Cross-origin handoff** — backend mints a short-lived Firebase custom
  token, the website passes it through a URL fragment, and the dashboard
  calls `signInWithCustomToken`. (Requires a small backend change.)
- **Shared production domain** — when the dashboard moves under
  `app.quantiliom.ai` and the website under `quantiliom.ai`, Firebase
  Auth can share the session via `authDomain` config.
- **Interim** — sign-in panel on the dashboard origin (users sign in
  once on `localhost:5173` for dev only).

Until then, "logged in on the website" and "logged in on the dashboard"
are two separate states by design.

## Current scope

- App shell: full-viewport grid with fixed dark sidebar and main scroll area.
- Sidebar: brand, primary nav (Home active by default), Settings, and a
  Free-plan / Upgrade card pinned to the bottom.
- Topbar: breadcrumb, notification bell with badge dot, an account pill
  showing the **real** Firebase user (`displayName` or email-local-part),
  and an account dropdown with **Sign out**.
- Hero + AI input panel with example chips (`SaaS MVP`, `Mobile app`,
  `AI tool`, `Marketplace`, `Internal dashboard`).
- Mock content cards: recent drafts, recommended next steps, product
  readiness checklist, and a "what Quantiliom can do today" preview.
- Responsive: ≥901px desktop grid; ≤900px sidebar becomes a slide-in drawer
  toggled from the topbar.
- **Firebase Web SDK** for the auth gate (Auth only, no Firestore, no
  Analytics).

## What this milestone does NOT include

- **Cross-origin auth handoff** — see "Auth gate" above.
- Backend HTTP calls (`/api/users/me`, `/api/onboarding/complete`, …).
  The Topbar plan is hardcoded to `Free Plan` until backend integration
  lands.
- Project CRUD, AI generation, billing, account settings.
- Routing. The shell is a single page; React Router lands when it has at
  least two destinations.

See [AGENTS.md](./AGENTS.md) for the full list of repository constraints.
