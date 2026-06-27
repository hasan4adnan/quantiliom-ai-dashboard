import { useEffect, useMemo, useRef, useState } from "react";
import {
  architecturePattern,
  extractComponents,
  normalizeArchitectureResult,
  prettyEnum,
  type ArchitectureComponent,
  type NormalizedArchitectureEdge,
} from "../lib/architectureResult";

/**
 * Architecture board — diagram-only canvas (Step 9m / 9n polish).
 *
 * The workspace centre is a focused high-level system diagram, not a
 * report. We compute a deterministic layered layout from the extracted
 * components (client → gateway → service → data → external), render
 * components as nodes positioned absolutely on a dotted-grid canvas,
 * and draw connecting edges as SVG bezier paths behind the nodes.
 *
 * Step 9n refinements:
 *   - Slightly tighter node + gap dimensions so 5-layer diagrams fit
 *     more viewports without needing horizontal scroll.
 *   - Stage size is computed strictly from content (no artificial
 *     min-width); when content is narrower than the canvas viewport,
 *     the stage sits in the top-left and the dotted grid extends
 *     around it. When wider, the canvas scrolls.
 *   - Right/left edge fade overlays + a tiny "Scroll canvas" pill
 *     appear only when horizontal overflow is detected, so the user
 *     can tell the canvas is scrollable without us having to introduce
 *     zoom/pan or a minimap.
 *
 * What this view still intentionally does NOT render:
 *   - long report sections (components/tech/decisions/scaling/security)
 *   - validation warnings
 *   - recommended profile explanation
 *   - tradeoffs / alternative cards
 *   - artifact placeholders or "coming next" hints
 *   - the raw Mermaid source
 */

type Props = {
  architecture: unknown;
  brief: string | null;
};

type LayerKey = "client" | "gateway" | "service" | "data" | "external";

const LAYER_ORDER: LayerKey[] = [
  "client",
  "gateway",
  "service",
  "data",
  "external",
];

const NODE_W = 168;
const NODE_H = 64;
const LAYER_X_GAP = 60;
const ROW_GAP = 20;
const STAGE_PAD_X = 32;
const STAGE_PAD_Y_TOP = 36;
const STAGE_PAD_Y_BOTTOM = 32;
const MAX_INFERRED_EDGES = 40;

type DiagramNode = {
  id: string;
  name: string;
  category: string | null;
  role: string | null;
  layer: LayerKey;
  x: number;
  y: number;
  width: number;
  height: number;
};

type DiagramEdge = {
  id: string;
  fromId: string;
  toId: string;
};

type DiagramModel = {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  width: number;
  height: number;
};

/**
 * Bucket a component into one of the five layers. Anything we don't
 * recognize lands in `service`, which keeps the diagram dense rather
 * than dropping components on the floor.
 */
function classifyComponent(c: ArchitectureComponent): LayerKey {
  const raw = `${c.category ?? ""} ${c.name}`.toLowerCase();
  if (/\b(client|frontend|web|mobile|spa|app|ui|browser|device)\b/.test(raw))
    return "client";
  if (
    /\b(gateway|edge|cdn|load[-_ ]?balancer|lb|router|ingress|api[-_ ]?gateway|reverse[-_ ]?proxy|auth)\b/.test(
      raw
    )
  )
    return "gateway";
  if (
    /\b(database|datastore|postgres|mysql|sql|nosql|mongo|dynamo|cache|redis|memcached|queue|kafka|rabbit|sqs|search|elasticsearch|opensearch|warehouse|storage|s3|blob|object[-_ ]?store|bucket)\b/.test(
      raw
    )
  )
    return "data";
  if (
    /\b(external|integration|3rd|third[-_ ]?party|webhook|provider|saas|observability|monitoring|logging|tracing|analytics|email|sms|notification)\b/.test(
      raw
    )
  )
    return "external";
  return "service";
}

function buildDiagramModel(
  components: ArchitectureComponent[],
  rawEdges: NormalizedArchitectureEdge[]
): DiagramModel {
  if (components.length === 0) {
    return { nodes: [], edges: [], width: 0, height: 0 };
  }

  // Group by layer; drop empty layers so the diagram isn't padded with
  // dead columns when, say, no external nodes exist.
  const byLayer: Record<LayerKey, ArchitectureComponent[]> = {
    client: [],
    gateway: [],
    service: [],
    data: [],
    external: [],
  };
  for (const c of components) byLayer[classifyComponent(c)].push(c);
  const activeLayers = LAYER_ORDER.filter((k) => byLayer[k].length > 0);
  if (activeLayers.length === 0) {
    return { nodes: [], edges: [], width: 0, height: 0 };
  }

  // Canvas size — driven strictly by content so the dotted grid
  // extends around it when the canvas viewport is wider, and the
  // canvas scrolls when narrower. No artificial min-width: an
  // architecture with two layers should render at its natural size,
  // not be stretched into "empty diagram with two boxes in a corner".
  const maxRows = Math.max(
    1,
    ...activeLayers.map((k) => byLayer[k].length)
  );
  const stageWidth =
    STAGE_PAD_X * 2 +
    activeLayers.length * NODE_W +
    Math.max(0, activeLayers.length - 1) * LAYER_X_GAP;
  const stageHeight =
    STAGE_PAD_Y_TOP +
    maxRows * NODE_H +
    Math.max(0, maxRows - 1) * ROW_GAP +
    STAGE_PAD_Y_BOTTOM;

  // Centre each layer's nodes vertically inside the usable stage area
  // (between the top and bottom padding). Layers with fewer nodes
  // float to the middle so they don't stick to the top while taller
  // columns extend down.
  const usableHeight = stageHeight - STAGE_PAD_Y_TOP - STAGE_PAD_Y_BOTTOM;
  const nodes: DiagramNode[] = [];
  for (let li = 0; li < activeLayers.length; li++) {
    const layer = activeLayers[li]!;
    const comps = byLayer[layer];
    const colHeight =
      comps.length * NODE_H + Math.max(0, comps.length - 1) * ROW_GAP;
    const startY =
      STAGE_PAD_Y_TOP + Math.max(0, (usableHeight - colHeight) / 2);
    const x = STAGE_PAD_X + li * (NODE_W + LAYER_X_GAP);
    for (let i = 0; i < comps.length; i++) {
      const c = comps[i]!;
      nodes.push({
        id: c.id,
        name: c.name,
        category: c.category,
        role: c.role,
        layer,
        x,
        y: startY + i * (NODE_H + ROW_GAP),
        width: NODE_W,
        height: NODE_H,
      });
    }
  }

  const edges =
    rawEdges.length > 0
      ? resolveEdges(nodes, rawEdges)
      : inferEdges(nodes, byLayer);

  return { nodes, edges, width: stageWidth, height: stageHeight };
}

function resolveEdges(
  nodes: DiagramNode[],
  rawEdges: NormalizedArchitectureEdge[]
): DiagramEdge[] {
  const byId = new Map<string, string>();
  const byName = new Map<string, string>();
  for (const n of nodes) {
    byId.set(n.id, n.id);
    byName.set(n.name.toLowerCase(), n.id);
  }
  const resolve = (key: string): string | null => {
    const trimmed = key.trim();
    if (!trimmed) return null;
    return byId.get(trimmed) ?? byName.get(trimmed.toLowerCase()) ?? null;
  };
  const seen = new Set<string>();
  const out: DiagramEdge[] = [];
  for (const e of rawEdges) {
    const fromId = resolve(e.from);
    const toId = resolve(e.to);
    if (!fromId || !toId || fromId === toId) continue;
    const key = `${fromId}->${toId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ id: key, fromId, toId });
  }
  return out;
}

function inferEdges(
  nodes: DiagramNode[],
  byLayer: Record<LayerKey, ArchitectureComponent[]>
): DiagramEdge[] {
  const idsForLayer = (k: LayerKey): string[] =>
    nodes.filter((n) => n.layer === k).map((n) => n.id);
  const clients = idsForLayer("client");
  const gateways = idsForLayer("gateway");
  const services = idsForLayer("service");
  const dataNodes = idsForLayer("data");
  const externals = idsForLayer("external");

  const seen = new Set<string>();
  const out: DiagramEdge[] = [];
  const push = (fromId: string, toId: string) => {
    if (!fromId || !toId || fromId === toId) return;
    if (out.length >= MAX_INFERRED_EDGES) return;
    const key = `${fromId}->${toId}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ id: key, fromId, toId });
  };

  if (gateways.length > 0) {
    const firstGateway = gateways[0]!;
    for (const cid of clients) push(cid, firstGateway);
    for (const gid of gateways) {
      for (const sid of services) push(gid, sid);
    }
  } else if (services.length > 0) {
    const firstService = services[0]!;
    for (const cid of clients) push(cid, firstService);
  }

  for (const sid of services) {
    for (const did of dataNodes) push(sid, did);
    if (externals.length > 0) push(sid, externals[0]!);
  }

  if (
    out.length === 0 &&
    nodes.length >= 2 &&
    LAYER_ORDER.some((k) => byLayer[k].length > 0)
  ) {
    const firstByLayer = LAYER_ORDER.map((k) => idsForLayer(k)[0]).filter(
      (v): v is string => !!v
    );
    for (let i = 0; i < firstByLayer.length - 1; i++) {
      const a = firstByLayer[i]!;
      const b = firstByLayer[i + 1]!;
      const key = `${a}->${b}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push({ id: key, fromId: a, toId: b });
      }
    }
  }

  return out;
}

export default function ArchitectureBoard({ architecture, brief }: Props) {
  const normalized = useMemo(
    () => normalizeArchitectureResult(architecture),
    [architecture]
  );
  const components = useMemo(
    () =>
      normalized.architecture ? extractComponents(normalized.architecture) : [],
    [normalized.architecture]
  );
  const model = useMemo(
    () => buildDiagramModel(components, normalized.edges),
    [components, normalized.edges]
  );

  const pattern = normalized.architecture
    ? architecturePattern(normalized.architecture)
    : null;
  const profileLabel = normalized.recommendedProfileLabel;

  const chips: { label: string; value: string }[] = [];
  if (profileLabel) chips.push({ label: "Profile", value: profileLabel });
  if (pattern)
    chips.push({ label: "Pattern", value: prettyEnum(pattern) ?? pattern });
  if (components.length > 0)
    chips.push({ label: "Components", value: String(components.length) });

  // brief is intentionally not rendered as a paragraph — keeping the
  // canvas focused on the diagram. We still accept it via props so the
  // caller's contract stays stable.
  void brief;

  // Detect horizontal overflow on the canvas-grid so we can light up
  // the edge fades + scroll hint. ResizeObserver covers both viewport
  // resizes and model-driven size changes; the scroll listener handles
  // user interaction. We coalesce into a single boolean per side and
  // bail when nothing changed, so the diagram doesn't re-render for
  // every pixel of scroll.
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [overflow, setOverflow] = useState<{ left: boolean; right: boolean }>({
    left: false,
    right: false,
  });

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const update = () => {
      const left = el.scrollLeft > 1;
      const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
      setOverflow((prev) =>
        prev.left === left && prev.right === right ? prev : { left, right }
      );
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    el.addEventListener("scroll", update, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", update);
    };
  }, [model.width, model.height, components.length]);

  const empty = components.length === 0;

  return (
    <div className="architecture-canvas" aria-label="Architecture diagram">
      <header className="architecture-canvas-header">
        <span className="architecture-canvas-title">High-level architecture</span>
        {chips.map((c) => (
          <span key={c.label} className="architecture-canvas-chip">
            <span>{c.label}</span>
            <strong>{c.value}</strong>
          </span>
        ))}
      </header>
      <div className="architecture-canvas-frame">
        <div className="architecture-canvas-grid" role="region" ref={gridRef}>
          {empty ? (
            <div className="architecture-diagram-empty" role="status">
              Architecture diagram data is not available for this run.
            </div>
          ) : (
            <DiagramStage model={model} />
          )}
        </div>
        {overflow.left ? (
          <div
            className="architecture-canvas-fade architecture-canvas-fade--left"
            aria-hidden="true"
          />
        ) : null}
        {overflow.right ? (
          <div
            className="architecture-canvas-fade architecture-canvas-fade--right"
            aria-hidden="true"
          />
        ) : null}
        {overflow.right || overflow.left ? (
          <div className="architecture-canvas-scroll-hint" aria-hidden="true">
            <span className="architecture-canvas-scroll-hint-glyph">↔</span>
            Scroll canvas
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DiagramStage({ model }: { model: DiagramModel }) {
  const nodeMap = useMemo(() => {
    const m = new Map<string, DiagramNode>();
    for (const n of model.nodes) m.set(n.id, n);
    return m;
  }, [model.nodes]);

  return (
    <div
      className="architecture-diagram-stage"
      style={{ width: model.width, height: model.height }}
    >
      <svg
        className="architecture-diagram-svg"
        width={model.width}
        height={model.height}
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <marker
            id="arch-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto"
          >
            <path
              d="M0,0 L10,5 L0,10 z"
              className="architecture-diagram-edge-arrow"
            />
          </marker>
        </defs>
        {model.edges.map((e) => {
          const from = nodeMap.get(e.fromId);
          const to = nodeMap.get(e.toId);
          // Guard: skip any edge whose endpoint we couldn't resolve to
          // a real node (defensive — resolveEdges/inferEdges already
          // filter these out, but a future shape change shouldn't
          // crash the SVG).
          if (!from || !to) return null;
          return (
            <path
              key={e.id}
              d={edgePath(from, to)}
              className="architecture-diagram-edge"
            />
          );
        })}
      </svg>
      {model.nodes.map((n) => (
        <div
          key={n.id}
          className={`architecture-diagram-node architecture-diagram-node--${n.layer}`}
          style={{ left: n.x, top: n.y, width: n.width, height: n.height }}
          title={n.role ?? undefined}
        >
          <span className="architecture-diagram-node-title">{n.name}</span>
          {n.category ? (
            <span className="architecture-diagram-node-meta">
              {prettyEnum(n.category) ?? n.category}
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function edgePath(from: DiagramNode, to: DiagramNode): string {
  // Connect the right edge of the source node to the left edge of the
  // target node with a cubic bezier. We tuck the path back by a small
  // gap so the arrowhead doesn't visually overlap the target border.
  const ARROW_GAP = 6;
  const x1 = from.x + from.width;
  const y1 = from.y + from.height / 2;
  const x2 = to.x - ARROW_GAP;
  const y2 = to.y + to.height / 2;
  const dx = Math.max(36, Math.abs(x2 - x1) * 0.45);
  return `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`;
}
