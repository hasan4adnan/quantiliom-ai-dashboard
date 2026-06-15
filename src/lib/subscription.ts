/**
 * Subscription state — UI mockup only.
 *
 * Lives in localStorage so the UpgradePage's "Complete payment" success
 * and the SubscriptionPage's current-plan card stay in sync across
 * navigations. No backend is involved — this is purely so the dashboard's
 * UI feels coherent end-to-end while we're still mocking out the
 * billing/checkout flow.
 *
 * State machine:
 *
 *   free  ──upgrade──▶  active  ──cancel──▶  cancelled  ──reactivate──▶  active
 *                          ▲                                            │
 *                          └────────── (or hits endsAt) ────────────────┘
 *                                       ↳ back to "free"
 *                                         (not auto-implemented here —
 *                                          treat cancelled-then-expired
 *                                          as outside this milestone)
 */
import { useCallback, useEffect, useState } from "react";

export type Plan = "pro" | "team";
export type Billing = "monthly" | "annual";

export type SubscriptionState =
  | { kind: "free" }
  | {
      kind: "active";
      plan: Plan;
      billing: Billing;
      startedAt: string; // ISO
      nextRenewalAt: string; // ISO
    }
  | {
      kind: "cancelled";
      plan: Plan;
      billing: Billing;
      startedAt: string; // ISO
      endsAt: string; // ISO — last day of access
    };

const STORAGE_KEY = "quantiliom.dashboard.subscription";

function load(): SubscriptionState {
  if (typeof window === "undefined") return { kind: "free" };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { kind: "free" };
    const parsed = JSON.parse(raw) as SubscriptionState;
    if (parsed && (parsed.kind === "active" || parsed.kind === "cancelled" || parsed.kind === "free")) {
      return parsed;
    }
    return { kind: "free" };
  } catch (_) {
    return { kind: "free" };
  }
}

function save(s: SubscriptionState): void {
  if (typeof window === "undefined") return;
  try {
    if (s.kind === "free") {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    }
  } catch (_) {
    /* quota / private mode — ignore, UI just won't persist */
  }
}

export function useSubscription(): {
  sub: SubscriptionState;
  setSub: (next: SubscriptionState) => void;
} {
  const [sub, setLocal] = useState<SubscriptionState>(load);

  // Stay in sync with other tabs (storage event) and with siblings in the
  // same tab (custom event).
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) setLocal(load());
    }
    function onCustom() {
      setLocal(load());
    }
    window.addEventListener("storage", onStorage);
    window.addEventListener("quantiliom:subscription-changed", onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("quantiliom:subscription-changed", onCustom);
    };
  }, []);

  const setSub = useCallback((next: SubscriptionState) => {
    save(next);
    setLocal(next);
    window.dispatchEvent(new Event("quantiliom:subscription-changed"));
  }, []);

  return { sub, setSub };
}

/* ─── Helpers ─────────────────────────────────────────────────────────── */

export function activateSubscription(plan: Plan, billing: Billing): SubscriptionState {
  const now = new Date();
  const renewal = new Date(now);
  if (billing === "annual") renewal.setFullYear(renewal.getFullYear() + 1);
  else renewal.setMonth(renewal.getMonth() + 1);
  return {
    kind: "active",
    plan,
    billing,
    startedAt: now.toISOString(),
    nextRenewalAt: renewal.toISOString(),
  };
}

export function cancelSubscription(s: SubscriptionState): SubscriptionState {
  if (s.kind !== "active") return s;
  return {
    kind: "cancelled",
    plan: s.plan,
    billing: s.billing,
    startedAt: s.startedAt,
    endsAt: s.nextRenewalAt,
  };
}

export function reactivateSubscription(s: SubscriptionState): SubscriptionState {
  if (s.kind !== "cancelled") return s;
  return {
    kind: "active",
    plan: s.plan,
    billing: s.billing,
    startedAt: s.startedAt,
    nextRenewalAt: s.endsAt,
  };
}

export function planLabel(p: Plan): string {
  return p === "pro" ? "Pro" : "Team";
}

export function billingLabel(b: Billing): string {
  return b === "annual" ? "Annual" : "Monthly";
}

export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch (_) {
    return iso;
  }
}

/** What the user will be charged on the next renewal — UI only, mirrors
 *  the same TAX_RATE the upgrade page uses. */
export const TAX_RATE = 0.2;

const PRICE: Record<Plan, { monthly: number; annual: number }> = {
  pro: { monthly: 29, annual: 276 },
  team: { monthly: 79, annual: 756 },
};

export function priceForCycle(plan: Plan, billing: Billing): number {
  return PRICE[plan][billing];
}

export function totalWithTax(plan: Plan, billing: Billing): number {
  const sub = priceForCycle(plan, billing);
  return +(sub + sub * TAX_RATE).toFixed(2);
}
