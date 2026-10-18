// The graph panel (G-5, A11Y-1; 01-interfaces-runtime.md section 10 and 08's DOM contract): the
// layered canvases, drawn at most once per animation frame at the size useGraphSize reports, and
// the graph's one role img surface, named from the view and the plotted rows. The engine holds the
// viewport (08 Decision "The engine holds the viewport"). The controls (G-5, L-1) zoom by 2 about
// the centre; Home shows only off the default view and fades (AN-8); the surface takes the graph
// keys (KB-8) and the panel drag, pinch and wheel (useGraphInput).

import { House, Minus, Plus, Settings } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import type { EngineSnapshot } from "@/lib/calculator-v2/core/api/engine";
import {
  defaultViewport,
  isDefaultViewport,
  ZOOM_BUTTON_FACTOR,
  zoomViewport,
  type ViewSpec,
} from "@/lib/calculator-v2/plot/viewport";
import { NAME_DEBOUNCE_MS, NAME_MAX_WAIT_MS } from "@/lib/calculator-v2/render/constants";
import { pickGrid } from "@/lib/calculator-v2/render/grid-plan";
import { GraphRenderer, readRenderTheme } from "@/lib/calculator-v2/render/renderer";
import type { SkinId } from "@/lib/calculator-v2/theme/skins";
import { useSkin } from "../hooks/skin";
import { useEngine, useEngineSnapshot } from "../hooks/use-engine";
import { countPlots, graphAccessibleName } from "./accessible-name";
import { homeFadeMs, useHomePresence, type HomePhase } from "./home-presence";
import { GRAPH_CONTROL_LABELS } from "./labels";
import {
  buildRenderRows,
  displayedGeometry,
  updateRegionCache,
  type RegionCache,
} from "./render-rows";
import { useDebounced } from "./use-debounced";
import { useGraphInput } from "./use-graph-input";
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
type Ref = RefObject<HTMLElement | null>;
type HomeButtonProps = { phase: HomePhase; homeRef: Ref; surface: Ref; onActivate(): void };

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

/** Moves focus to the graph surface when `el` has it, so focus never falls to the body. */
function handOff(el: HTMLElement | null, surface: Ref): void {
  if (el === null) return;
  if ((el.getRootNode() as Document | ShadowRoot).activeElement === el) {
    surface.current?.focus({ preventScroll: true });
  }
}

/**
 * The Home control (G-5, AN-8). While leaving it is inert and hidden from assistive technology,
 * and focus moves to the graph as it starts to leave or, with no fade, as it is removed: React
 * runs a deleted component's layout cleanups before it removes the node, so the cleanup still
 * sees the button focused. The refs are stable, so that cleanup runs only at removal and a
 * re-render never moves focus off a focused Home.
 */
function HomeButton({ phase, homeRef, surface, onActivate }: HomeButtonProps): JSX.Element {
  useLayoutEffect(() => {
    if (phase === "leaving") handOff(homeRef.current, surface);
  }, [phase, homeRef, surface]);
  useLayoutEffect(() => {
    const el = homeRef.current;
    return () => handOff(el, surface);
  }, [homeRef, surface]);
  const leaving = phase === "leaving";
  return (
    <button
      ref={homeRef as RefObject<HTMLButtonElement>}
      type="button"
      aria-label={GRAPH_CONTROL_LABELS.home}
      title={GRAPH_CONTROL_LABELS.home}
      data-graph-home=""
      data-phase={phase}
      tabIndex={leaving ? -1 : undefined}
      aria-hidden={leaving ? "true" : undefined}
      onClick={onActivate}
    >
      <House size={18} aria-hidden="true" />
    </button>
  );
}

export function GraphPanel(props: GraphPanelProps): JSX.Element {
  const { host, themeRevision, reducedMotion, settingsOpen, onOpenSettings } = props;
  const engine = useEngine();
  const snapshot = useEngineSnapshot(engine);
  const skin = useSkin();
  const panel = useRef<HTMLDivElement>(null);
  const layers = useRef<HTMLDivElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const homeRef = useRef<HTMLButtonElement>(null);
  const size = useGraphSize(layers, engine);
  const input = useGraphInput({ panel, surface, engine, size });

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

  // Before Home mounts there is no transition to read, so it enters with a fade unless motion is
  // reduced (AN-8 fades in as well as out); once mounted, its computed transition gives the time.
  const fadeMs = (): number =>
    homeRef.current === null ? (reducedMotion ? 0 : 1) : homeFadeMs(reducedMotion, homeRef.current);
  const offDefault = size !== null && !isDefaultViewport(snapshot.viewport, size.size);
  const phase = useHomePresence(offDefault, fadeMs);

  const zoom = (factor: number) =>
    input.applyNow((v) => {
      const { left, right, bottom, top } = v.viewport;
      return zoomViewport(v.viewport, factor, { x: (left + right) / 2, y: (bottom + top) / 2 });
    });
  const goHome = (): void => {
    surface.current?.focus({ preventScroll: true });
    input.applyNow((v) => defaultViewport(v.size));
  };

  return (
    <div ref={panel} className="kc-graph" data-graph-panel="">
      <div ref={layers} className="kc-graph-layers" data-graph-layers="" aria-hidden="true" />
      <div
        ref={surface}
        className="kc-graph-surface"
        role="img"
        aria-label={name}
        tabIndex={0}
        onKeyDown={input.onKeyDown}
      />
      <div className="kc-graph-controls" role="group" aria-label={GRAPH_CONTROL_LABELS.group}>
        <button
          type="button"
          aria-label={GRAPH_CONTROL_LABELS.settings}
          title={GRAPH_CONTROL_LABELS.settings}
          aria-haspopup="dialog"
          aria-expanded={settingsOpen}
          onClick={(e) => onOpenSettings(e.currentTarget)}
        >
          <Settings size={18} aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label={GRAPH_CONTROL_LABELS.zoomIn}
          title={GRAPH_CONTROL_LABELS.zoomIn}
          onClick={() => zoom(ZOOM_BUTTON_FACTOR)}
        >
          <Plus size={18} aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label={GRAPH_CONTROL_LABELS.zoomOut}
          title={GRAPH_CONTROL_LABELS.zoomOut}
          onClick={() => zoom(1 / ZOOM_BUTTON_FACTOR)}
        >
          <Minus size={18} aria-hidden="true" />
        </button>
        {phase !== "absent" && (
          <HomeButton phase={phase} homeRef={homeRef} surface={surface} onActivate={goHome} />
        )}
      </div>
    </div>
  );
}
