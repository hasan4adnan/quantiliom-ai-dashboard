/**
 * Safe extraction helpers for the architecture-result payload returned by
 * GET /api/jobs/:id. The shape lives in the backend engine and may
 * evolve, so we always treat the value as `unknown` here and rely on
 * narrow type guards before reading any field. The dashboard must never
 * crash if a field shows up in a different shape than expected.
 *
 * Shared by:
 *   - src/components/ArchitecturePreview.tsx (compact post-job preview)
 *   - src/components/ArchitectureBoard.tsx   (full workspace board)
 *
 * Keep this file pure: no React, no globals, no side effects.
 */

export function asObject(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  return v as Record<string, unknown>;
}

export function asString(v: unknown): string | null {
  return typeof v === "string" && v.trim().length > 0 ? v : null;
}

export function asBool(v: unknown): boolean | null {
  return typeof v === "boolean" ? v : null;
}

export function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string" && x.length > 0);
}

export function asObjectArray(v: unknown): Record<string, unknown>[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => asObject(x))
    .filter((x): x is Record<string, unknown> => x !== null);
}

export function prettyEnum(v: string | null): string | null {
  if (!v) return null;
  return v
    .split("_")
    .map((p) => (p.length === 0 ? p : p[0]!.toUpperCase() + p.slice(1)))
    .join(" ");
}

export function yesNo(v: boolean | null): string {
  if (v === null) return "—";
  return v ? "Yes" : "No";
}

export type ArchitectureComponent = {
  name: string;
  role: string | null;
  category: string | null;
  technologies: string[];
};

export function extractComponents(
  arch: Record<string, unknown>
): ArchitectureComponent[] {
  const raw = asObjectArray(arch.components);
  return raw
    .map((c) => {
      const name = asString(c.name) ?? asString(c.title);
      if (!name) return null;
      const role =
        asString(c.role) ??
        asString(c.purpose) ??
        asString(c.responsibility) ??
        asString(c.description) ??
        null;
      const category =
        asString(c.category) ??
        asString(c.type) ??
        asString(c.layer) ??
        asString(c.kind) ??
        null;
      const techCandidates = [
        c.technologies,
        c.tech,
        c.stack,
        c.tools,
      ];
      let technologies: string[] = [];
      for (const cand of techCandidates) {
        const arr = asStringArray(cand);
        if (arr.length > 0) {
          technologies = arr;
          break;
        }
        const single = asString(cand);
        if (single) {
          technologies = [single];
          break;
        }
      }
      return { name, role, category, technologies };
    })
    .filter((c): c is ArchitectureComponent => c !== null);
}

export type TechItem = { group: string; entries: string[] };

export function extractTechStack(
  arch: Record<string, unknown>
): TechItem[] {
  const stack = arch.techStack;

  // Object form: { frontend: ["react"], backend: ["node"], … }
  const obj = asObject(stack);
  if (obj) {
    const out: TechItem[] = [];
    for (const [group, value] of Object.entries(obj)) {
      const entries = asStringArray(value);
      if (entries.length > 0) {
        out.push({ group, entries });
      } else {
        const single = asString(value);
        if (single) out.push({ group, entries: [single] });
      }
    }
    return out;
  }

  // Flat array of strings.
  const flat = asStringArray(stack);
  if (flat.length > 0) {
    return [{ group: "Stack", entries: flat }];
  }

  // Array of objects: { group, entries } / { name, category } / { layer, items }.
  const arr = asObjectArray(stack);
  if (arr.length > 0) {
    return arr
      .map((row) => {
        const group =
          asString(row.group) ??
          asString(row.category) ??
          asString(row.layer) ??
          asString(row.name) ??
          null;
        const entries =
          asStringArray(row.entries).length > 0
            ? asStringArray(row.entries)
            : asStringArray(row.items);
        if (!group) return null;
        if (entries.length === 0) {
          const single = asString(row.value) ?? asString(row.choice);
          if (!single) return null;
          return { group, entries: [single] };
        }
        return { group, entries };
      })
      .filter((t): t is TechItem => t !== null);
  }

  return [];
}

export function listPreview<T>(
  items: T[],
  max: number
): { shown: T[]; rest: number } {
  if (items.length <= max) return { shown: items, rest: 0 };
  return { shown: items.slice(0, max), rest: items.length - max };
}

export function architectureSummary(
  arch: Record<string, unknown>
): string | null {
  return (
    asString(arch.summary) ??
    asString(arch.overview) ??
    asString(arch.description)
  );
}

export function architecturePattern(
  arch: Record<string, unknown>
): string | null {
  return (
    asString(arch.patternUsed) ??
    asString(arch.pattern) ??
    asString(arch.architecturePattern)
  );
}

export function hasMermaidArtifact(
  arch: Record<string, unknown>
): boolean {
  return (
    asString(arch.mermaid) !== null ||
    asString(arch.diagram) !== null ||
    asObject(arch.diagram) !== null
  );
}

export function hasCostArtifact(arch: Record<string, unknown>): boolean {
  return asObject(arch.cost) !== null || asString(arch.costEstimate) !== null;
}

export function hasAlternativesArtifact(
  arch: Record<string, unknown>
): boolean {
  return asObjectArray(arch.alternatives).length > 0;
}
