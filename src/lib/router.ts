/**
 * Minimal hash-based router. The dashboard has a single page shell
 * (sidebar + topbar + main) and switches the main content based on the
 * URL fragment. Using the fragment instead of pathname avoids needing
 * any server-side rewrite for SPA routing in dev.
 *
 * Hash format:
 *   #route           → simple route (e.g. #projects)
 *   #route=param     → route + single string param (e.g. #upgrade=pro)
 *
 * The param slot is intentionally minimal — one string is enough for
 * "which plan is being upgraded to?" and similar narrow needs. If a
 * page ever needs more state than that, it should manage it locally;
 * the URL is for high-level navigation, not page-internal state.
 *
 * NOTE: the login screen also reads the URL fragment for its
 * signin/signup mode (`#login` / `#signup`). Those values are not
 * members of `Route` and will fall through to "home" when the user is
 * signed in, which is the desired behavior.
 */
import { useCallback, useEffect, useState } from "react";

export type Route =
  | "home"
  | "new"
  | "projects"
  | "documents"
  | "templates"
  | "subscription"
  | "upgrade"
  | "account"
  | "terms"
  | "privacy";

const ROUTES: readonly Route[] = [
  "home",
  "new",
  "projects",
  "documents",
  "templates",
  "subscription",
  "upgrade",
  "account",
  "terms",
  "privacy",
];

type ParsedHash = { route: Route; param: string | null };

function parseHash(): ParsedHash {
  const raw = window.location.hash.replace(/^#/, "").trim();
  if (!raw) return { route: "home", param: null };
  const eqIdx = raw.indexOf("=");
  const rawRoute = (eqIdx === -1 ? raw : raw.slice(0, eqIdx)).toLowerCase();
  const rawParam = eqIdx === -1 ? null : raw.slice(eqIdx + 1);
  const route = (ROUTES as readonly string[]).includes(rawRoute)
    ? (rawRoute as Route)
    : "home";
  let param: string | null = null;
  if (rawParam) {
    try {
      param = decodeURIComponent(rawParam);
    } catch (_) {
      param = rawParam;
    }
  }
  return { route, param };
}

export function useRoute(): {
  route: Route;
  param: string | null;
  navigate: (r: Route, param?: string) => void;
} {
  const [state, setState] = useState<ParsedHash>(parseHash);

  useEffect(() => {
    const handler = () => setState(parseHash());
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  const navigate = useCallback((r: Route, param?: string) => {
    const target = param
      ? `#${r}=${encodeURIComponent(param)}`
      : `#${r}`;
    if (window.location.hash === target) {
      // Same hash — manually update state since hashchange won't fire.
      setState({ route: r, param: param ?? null });
    } else {
      window.location.hash = target;
    }
    // Scroll the main scroll area back to the top on navigation.
    const scroller = document.querySelector(".app-scroll");
    if (scroller) scroller.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  return { ...state, navigate };
}
