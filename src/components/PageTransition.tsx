import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Coordinated route-to-route transition.
 *
 * On `pageKey` change, the previously rendered children are snapshotted
 * into an "outgoing" layer that overlays the new page (absolute, out of
 * flow) and animates out while the new page animates in. The outgoing
 * layer is unmounted once its exit animation completes, leaving the new
 * page alone in normal document flow — so scroll height, focus, and
 * native scrollbars all behave correctly.
 *
 * All choreography (timings, easing, child stagger) lives in CSS — this
 * component is just the orchestrator. See `.page-stage`, `.page-layer`,
 * `.page-layer.is-leaving`, and the staggered `.page-enter > *` rules in
 * dashboard.css.
 */
type Props = {
  pageKey: string;
  children: ReactNode;
};

// Must match the `.page-layer.is-leaving` animation duration in dashboard.css.
// Kept slightly longer than the CSS to guarantee the layer is gone before the
// next navigation, even under render scheduling jitter.
const EXIT_MS = 220;

type Layer = { key: string; node: ReactNode };

export default function PageTransition({ pageKey, children }: Props) {
  // The most recently rendered children — used as the snapshot source when
  // the route changes. Ref (not state) so it doesn't trigger re-renders.
  const lastRenderedRef = useRef<{ key: string; node: ReactNode }>({
    key: pageKey,
    node: children,
  });

  const [leaving, setLeaving] = useState<Layer | null>(null);
  const [prevKey, setPrevKey] = useState<string>(pageKey);

  // Detect a route change and snapshot the previous render *during* render
  // (React's recommended pattern for state derived from props — see the
  // "You might not need an effect" docs). The setState here is cheap and
  // React discards the in-progress render to start over with the new state.
  if (pageKey !== prevKey) {
    setLeaving({ key: lastRenderedRef.current.key, node: lastRenderedRef.current.node });
    setPrevKey(pageKey);
  }

  // Keep the snapshot source fresh after every commit so the next route
  // change captures the latest rendered tree (in case the page updated
  // its own state right before navigation).
  useEffect(() => {
    lastRenderedRef.current = { key: pageKey, node: children };
  });

  // Remove the leaving layer once its exit animation has played out. If
  // the user navigates again mid-exit, the effect re-runs and the prior
  // timer is cleared, so the most recent leaving layer always wins.
  useEffect(() => {
    if (!leaving) return;
    const t = window.setTimeout(() => setLeaving(null), EXIT_MS);
    return () => window.clearTimeout(t);
  }, [leaving]);

  return (
    <div className="page-stage">
      {leaving ? (
        <div className="page-layer is-leaving" key={`leave:${leaving.key}`} aria-hidden="true">
          {leaving.node}
        </div>
      ) : null}
      <div className="page-layer is-entering" key={`enter:${pageKey}`}>
        {children}
      </div>
    </div>
  );
}
