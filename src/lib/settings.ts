/**
 * Local user preferences for the dashboard.
 *
 * These are distinct from the onboarding answers persisted on the
 * backend (role, technical level, etc.) — those describe the user;
 * these describe how the user wants the product to behave on this
 * device. Stored in localStorage as a single versioned JSON blob so
 * we can evolve the shape without losing existing preferences.
 *
 * Future work: a backend mirror (PATCH /api/users/me/preferences) so
 * the same user gets the same look on a new device. For now the
 * Settings page tells the user, explicitly, that changes are local.
 */
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "quantiliom.dashboard.settings.v1";

export type Density = "cozy" | "compact";
export type Language = "en" | "tr";
export type DateFormat = "auto" | "ymd" | "mdy" | "dmy";
export type WeekStart = "auto" | "sun" | "mon";
export type TimezoneMode = "auto" | "utc";
export type DetailLevel = "simple" | "balanced" | "technical";
export type ResponseLength = "concise" | "balanced" | "detailed";
export type CodeStyle = "minimal" | "standard" | "explanatory";
export type ArchStyle =
  | "modular_monolith"
  | "microservices"
  | "serverless"
  | "ai_first";

export type Settings = {
  appearance: {
    density: Density;
  };
  language: {
    uiLanguage: Language;
    dateFormat: DateFormat;
    weekStart: WeekStart;
    timezone: TimezoneMode;
  };
  ai: {
    detailLevel: DetailLevel;
    responseLength: ResponseLength;
    codeStyle: CodeStyle;
    defaultArchStyle: ArchStyle;
    askBeforeGeneratingCode: boolean;
    streamResponses: boolean;
  };
  notifications: {
    productUpdates: boolean;
    billing: boolean;
    weeklySummary: boolean;
    marketing: boolean;
    inApp: boolean;
    inAppSounds: boolean;
  };
  privacy: {
    improveModelsFromMyPrompts: boolean;
    productTelemetry: boolean;
    shareDiagnosticsWithSupport: boolean;
    retainSearchHistory: boolean;
  };
  workspace: {
    sidebarDefault: "expanded" | "collapsed";
    defaultProjectVisibility: "private" | "team";
    autosaveDelaySec: number;
    showWelcomeOnHome: boolean;
    confirmBeforeDeletingProjects: boolean;
  };
};

export const DEFAULTS: Settings = {
  appearance: {
    density: "cozy",
  },
  language: {
    uiLanguage: "en",
    dateFormat: "auto",
    weekStart: "auto",
    timezone: "auto",
  },
  ai: {
    detailLevel: "balanced",
    responseLength: "balanced",
    codeStyle: "standard",
    defaultArchStyle: "modular_monolith",
    askBeforeGeneratingCode: true,
    streamResponses: true,
  },
  notifications: {
    productUpdates: true,
    billing: true,
    weeklySummary: false,
    marketing: false,
    inApp: true,
    inAppSounds: false,
  },
  privacy: {
    // Default OFF — mirrors the explicit promise in our Privacy
    // Policy that paid-plan content isn't used to train models.
    improveModelsFromMyPrompts: false,
    productTelemetry: true,
    shareDiagnosticsWithSupport: false,
    retainSearchHistory: true,
  },
  workspace: {
    sidebarDefault: "expanded",
    defaultProjectVisibility: "private",
    autosaveDelaySec: 15,
    showWelcomeOnHome: true,
    confirmBeforeDeletingProjects: true,
  },
};

function mergeWithDefaults(partial: Partial<Settings>): Settings {
  // Shallow-merge each group so older saved blobs missing newer keys
  // still pick up the defaults instead of yielding `undefined`.
  return {
    appearance: { ...DEFAULTS.appearance, ...(partial.appearance ?? {}) },
    language: { ...DEFAULTS.language, ...(partial.language ?? {}) },
    ai: { ...DEFAULTS.ai, ...(partial.ai ?? {}) },
    notifications: {
      ...DEFAULTS.notifications,
      ...(partial.notifications ?? {}),
    },
    privacy: { ...DEFAULTS.privacy, ...(partial.privacy ?? {}) },
    workspace: { ...DEFAULTS.workspace, ...(partial.workspace ?? {}) },
  };
}

function safeParse(raw: string | null): Settings | null {
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw) as unknown;
    if (!obj || typeof obj !== "object") return null;
    return mergeWithDefaults(obj as Partial<Settings>);
  } catch (_) {
    return null;
  }
}

export function loadSettings(): Settings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    return safeParse(window.localStorage.getItem(STORAGE_KEY)) ?? DEFAULTS;
  } catch (_) {
    return DEFAULTS;
  }
}

export function saveSettings(s: Settings): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch (_) {
    /* localStorage may be unavailable in private mode — settings just
       won't persist across reloads. UI still reflects the in-memory
       value for the current session, which is the best we can do. */
  }
}

export function applySettings(s: Settings): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-density", s.appearance.density);
}

/**
 * One-shot bootstrap: call as early as possible (module load) so the
 * saved appearance is applied before first paint and the page doesn't
 * flash the defaults first.
 */
export function bootstrapSettings(): Settings {
  const s = loadSettings();
  applySettings(s);
  return s;
}

export function useSettings(): {
  settings: Settings;
  update: (next: Settings) => void;
  reset: () => void;
} {
  const [settings, setSettings] = useState<Settings>(() => loadSettings());

  useEffect(() => {
    // Sync with changes from other tabs in the same browser. Same-tab
    // updates already flow through setSettings/applySettings below.
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      const next = safeParse(e.newValue);
      if (next) {
        setSettings(next);
        applySettings(next);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const update = useCallback((next: Settings) => {
    setSettings(next);
    saveSettings(next);
    applySettings(next);
  }, []);

  const reset = useCallback(() => {
    setSettings(DEFAULTS);
    saveSettings(DEFAULTS);
    applySettings(DEFAULTS);
  }, []);

  return { settings, update, reset };
}
