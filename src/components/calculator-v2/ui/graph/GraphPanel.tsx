// The graph panel (G-5, A11Y-1; 01-interfaces-runtime.md section 10 and 08's DOM contract): the
// layered canvases, drawn at most once per animation frame at the size useGraphSize reports, and
// the graph's one role img surface, named from the view and the plotted rows. The engine holds the
// viewport (08 Decision "The engine holds the viewport"). The controls (G-5, L-1) zoom by 2 about
// the centre; Home shows only off the default view and fades (AN-8); the surface takes the graph
// keys (KB-8) and the panel drag, pinch and wheel (useGraphInput).

import { House, Minus, Plus, Settings } from "lucide-react";
import {
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
  type KeyboardEvent,
  type RefObject,
} from "react";
import { formatPoiLabel, formatTraceLabel } from "@/lib/calculator-v2/poi/format";
import type { EngineSnapshot } from "@/lib/calculator-v2/core/api/engine";
import {
  defaultViewport,
  isDefaultViewport,
  ZOOM_BUTTON_FACTOR,
  zoomViewport,
  type ViewSpec,
  worldToPx,
} from "@/lib/calculator-v2/plot/viewport";
import { NAME_DEBOUNCE_MS, NAME_MAX_WAIT_MS } from "@/lib/calculator-v2/render/constants";
import { pickGrid } from "@/lib/calculator-v2/render/grid-plan";
import { GraphRenderer, readRenderTheme } from "@/lib/calculator-v2/render/renderer";
import type { SkinId } from "@/lib/calculator-v2/theme/skins";
import { useSkin } from "../hooks/skin";
import { useEngine, useEngineSnapshot } from "../hooks/use-engine";
import { countPlots, graphAccessibleName } from "./accessible-name";
import { homeFadeMs, useHomePresence, type HomePhase } from "./home-presence";
import { KeyboardTraceContext, type KeyboardTrace } from "./keyboard-trace";
import { GRAPH_CONTROL_LABELS } from "./labels";
import { PoiOverlay } from "./PoiOverlay";
import type { LabelState } from "./poi-labels";
import {
  buildRenderRows,
  displayedGeometry,
  updateRegionCache,
  type RegionCache,
} from "./render-rows";
import { useDebounced } from "./use-debounced";
import { useGraphInput } from "./use-graph-input";
import { useGraphSize, type GraphSize } from "./use-graph-size";
import { openLabels, poiDots, usePoiLabels } from "./use-poi-labels";
import { useTrace, type TraceState } from "./use-trace";

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
  labels: LabelState;
  trace: TraceState | null;
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

  const { snapshot, skin, size, labels, trace } = inputs;
  useEffect(() => {
    if (size === null || frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      const container = layers.current;
      const { snapshot: s, skin: k, cache, size: g, host, labels: l, trace: tr } = latest.current;
      if (renderer.current === null || container === null || g === null) return;
      const view: ViewSpec = { viewport: s.viewport, size: g.size, dpr: g.dpr };
      renderer.current.render({
        view,
        grid: pickGrid(s.settings),
        rows: buildRenderRows(s, k, view, cache),
        theme: readRenderTheme(host),
        poi: poiDots(s, l),
        trace: tr === null ? null : { x: tr.wx, y: tr.wy, color: tr.color },
      });
      container.dataset.renderedRevision = String(s.revision);
    });
  }, [layers, snapshot, skin, themeRevision, size, labels, trace]);
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

/** The selected row's drawn vertices in CSS px, every 4th, for label placement (POI-19). */
function selectedCurvePx(s: EngineSnapshot, view: ViewSpec): [number, number][] {
  const g = s.selectedRowId === null ? undefined : s.geometry.get(s.selectedRowId);
  if (g === undefined || g.kind !== "curve") return [];
  const out: [number, number][] = [];
  for (let k = 0; k + 1 < g.polylines.length; k += 8) {
    if (Number.isFinite(g.polylines[k]))
      out.push(worldToPx(view, g.polylines[k], g.polylines[k + 1]));
  }
  return out;
}

const noTrace = () => () => undefined;

/** POI-20: the keyboard trace's point as a drawn trace (dot and label), or null. */
function keyboardTracePoint(
  trace: KeyboardTrace | null,
  s: EngineSnapshot,
  view: ViewSpec | null,
  rows: ReturnType<typeof buildRenderRows>
): TraceState | null {
  const at = trace?.state ?? null;
  if (at === null || view === null) return null;
  const poi =
    s.poi?.rowId === at.rowId ? s.poi.points.find((p) => p.x === at.x && p.y === at.y) : undefined;
  const [x, y] = worldToPx(view, at.x, at.y);
  const text = poi === undefined ? formatTraceLabel(at.x, at.y, view) : formatPoiLabel(poi, view);
  const row = rows.find((r) => r.rowId === at.rowId);
  return row === undefined ? null : { x, y, wx: at.x, wy: at.y, text, color: row.color };
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
  const poi = usePoiLabels(snapshot, engine);
  const tracer = useTrace(engine);
  const keyboardTrace = useContext(KeyboardTraceContext);
  useSyncExternalStore(
    keyboardTrace === null ? noTrace : (l) => keyboardTrace.subscribe(l),
    () => keyboardTrace?.state ?? null
  );
  const current = useRef({ snapshot, skin, size, cache: NO_REGIONS });
  /** The view and the drawn rows as of the latest commit, or null while unsized. */
  const scene = (): { view: ViewSpec; rows: ReturnType<typeof buildRenderRows> } | null => {
    const { snapshot: s, skin: k, size: g, cache: c } = current.current;
    if (g === null) return null;
    const v: ViewSpec = { viewport: s.viewport, size: g.size, dpr: g.dpr };
    return { view: v, rows: buildRenderRows(s, k, v, c) };
  };
  const input = useGraphInput({
    panel,
    surface,
    engine,
    size,
    interaction: {
      claim(at, pointer) {
        const sc = scene();
        return sc !== null && tracer.claim(at, pointer, sc.view, sc.rows);
      },
      move(at) {
        const sc = scene();
        if (sc !== null) tracer.move(at, sc.view);
      },
      release: tracer.release,
      click(at, pointer) {
        const sc = scene();
        if (sc !== null) poi.click(at, pointer, sc.view, sc.rows);
      },
      viewChanged: poi.viewChanged,
    },
  });

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
  useLayoutEffect(() => {
    current.current = { snapshot, skin, size, cache };
  });
  const view: ViewSpec | null =
    size === null ? null : { viewport: snapshot.viewport, size: size.size, dpr: size.dpr };

  const plots = countPlots(snapshot.rows, displayedGeometry(snapshot, cache));
  const name = useDebounced(graphAccessibleName(snapshot.viewport, plots), NAME_DEBOUNCE_MS, {
    maxWaitMs: NAME_MAX_WAIT_MS,
  });

  const shownTrace =
    tracer.trace ??
    keyboardTracePoint(
      keyboardTrace,
      snapshot,
      view,
      view === null ? [] : buildRenderRows(snapshot, skin, view, cache)
    );
  useRenderLoop(
    layers,
    { snapshot, skin, cache, size, host, labels: poi.labels, trace: shownTrace },
    themeRevision
  );
  const onKeyDown = (e: KeyboardEvent): void => {
    if ((e.key === "[" || e.key === "]") && view !== null) {
      if (poi.step(e.key === "]" ? 1 : -1, view)) e.preventDefault();
      return;
    }
    input.onKeyDown(e);
  };

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
        onKeyDown={onKeyDown}
      />
      {view !== null && (
        <PoiOverlay
          labels={openLabels(snapshot, poi.labels, view)}
          curve={selectedCurvePx(snapshot, view)}
          size={view.size}
          trace={shownTrace}
        />
      )}
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
