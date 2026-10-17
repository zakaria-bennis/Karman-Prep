// The graph panel (G-5, A11Y-1; 01-interfaces-runtime.md section 10 and 08's DOM contract): the
// layered canvases, drawn at most once per animation frame at the size useGraphSize reports, and
// the graph's one role img surface, named from the view and the plotted rows. The engine holds the
// viewport (08 Decision "The engine holds the viewport"). 08 Task 7 adds the controls, the Home
// fade, the graph keys and pointer input.

import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import type { EngineSnapshot } from "@/lib/calculator-v2/core/api/engine";
import type { ViewSpec } from "@/lib/calculator-v2/plot/viewport";
import { NAME_DEBOUNCE_MS, NAME_MAX_WAIT_MS } from "@/lib/calculator-v2/render/constants";
import { pickGrid } from "@/lib/calculator-v2/render/grid-plan";
import { GraphRenderer, readRenderTheme } from "@/lib/calculator-v2/render/renderer";
import type { SkinId } from "@/lib/calculator-v2/theme/skins";
import { useSkin } from "../hooks/skin";
import { useEngine, useEngineSnapshot } from "../hooks/use-engine";
import { countPlots, graphAccessibleName } from "./accessible-name";
import {
  buildRenderRows,
  displayedGeometry,
  updateRegionCache,
  type RegionCache,
} from "./render-rows";
import { useDebounced } from "./use-debounced";
import { useGraphSize, type GraphSize } from "./use-graph-size";

export { graphAccessibleName };

export interface GraphPanelProps {
  host: Element; // shadow host
  themeRevision: number; // bumped by the shell on prefers-contrast and forced-colors changes (TH-15)
  reducedMotion: boolean;
  settingsOpen: boolean;
  onOpenSettings(anchor: HTMLElement): void; // Settings control (L-1)
}

/** What a frame draws, as of the latest commit. */
type FrameInputs = {
  snapshot: EngineSnapshot;
  skin: SkinId;
  cache: RegionCache;
  size: GraphSize | null;
  host: Element;
};
type FrameRef = { current: number | null };

const NO_REGIONS: RegionCache = new Map();

function cancelFrame(frame: FrameRef): void {
  if (frame.current !== null) cancelAnimationFrame(frame.current);
  frame.current = null;
}

/**
 * Owns the GraphRenderer on `layers` and draws the latest inputs in one coalesced animation frame
 * after any change of snapshot, skin, theme revision or size, while the size is known. Each frame
 * writes the drawn revision to `data-rendered-revision`. Unmounting cancels the frame and
 * destroys the renderer.
 */
function useRenderLoop(
  layers: RefObject<HTMLDivElement | null>,
  inputs: FrameInputs,
  themeRevision: number
): void {
  const renderer = useRef<GraphRenderer | null>(null);
  const frame = useRef<number | null>(null);
  const latest = useRef(inputs);
  useLayoutEffect(() => {
    latest.current = inputs;
  });

  useLayoutEffect(() => {
    const container = layers.current;
    if (container === null) return;
    const created = new GraphRenderer(container);
    renderer.current = created;
    return () => {
      cancelFrame(frame);
      renderer.current = null;
      created.destroy();
    };
  }, [layers]);

  const { snapshot, skin, size } = inputs;
  useEffect(() => {
    if (size === null || frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      const container = layers.current;
      const { snapshot: s, skin: k, cache, size: g, host } = latest.current;
      if (renderer.current === null || container === null || g === null) return;
      const view: ViewSpec = { viewport: s.viewport, size: g.size, dpr: g.dpr };
      renderer.current.render({
        view,
        grid: pickGrid(s.settings),
        rows: buildRenderRows(s, k, view, cache),
        theme: readRenderTheme(host),
      });
      container.dataset.renderedRevision = String(s.revision);
    });
  }, [layers, snapshot, skin, themeRevision, size]);
}

export function GraphPanel(props: GraphPanelProps): JSX.Element {
  const { host, themeRevision } = props;
  const engine = useEngine();
  const snapshot = useEngineSnapshot(engine);
  const skin = useSkin();
  const layers = useRef<HTMLDivElement>(null);
  const size = useGraphSize(layers, engine);

  // The region cache follows the snapshot during render; updateRegionCache is pure, so a repeated
  // render gives the same cache.
  const regions = useRef<{ snapshot: EngineSnapshot | null; cache: RegionCache }>({
    snapshot: null,
    cache: NO_REGIONS,
  });
  if (regions.current.snapshot !== snapshot) {
    regions.current = { snapshot, cache: updateRegionCache(regions.current.cache, snapshot) };
  }
  const { cache } = regions.current;

  const plots = countPlots(snapshot.rows, displayedGeometry(snapshot, cache));
  const name = useDebounced(graphAccessibleName(snapshot.viewport, plots), NAME_DEBOUNCE_MS, {
    maxWaitMs: NAME_MAX_WAIT_MS,
  });

  useRenderLoop(layers, { snapshot, skin, cache, size, host }, themeRevision);

  return (
    <div className="kc-graph" data-graph-panel="">
      <div ref={layers} className="kc-graph-layers" data-graph-layers="" aria-hidden="true" />
      <div className="kc-graph-surface" role="img" aria-label={name} tabIndex={0} />
    </div>
  );
}
