// The graph panel (G-5, A11Y-1; 's DOM contract): the
// layered canvases, drawn at most once per animation frame at the size useGraphSize reports, and
// the graph's one role img surface, named from the view and the plotted rows. The engine holds the
// viewport. The controls (G-5, L-1) zoom by 2 about
// the centre; Home shows only off the default view and fades (AN-8); the surface takes the graph
// keys (KB-8) and the panel drag, pinch and wheel (useGraphInput). Zoom to fit sits under Home
// (fit-view.ts); on a phone the view stays centred above the open keypad (view-inset.ts); the first
// curve a student graphs shows a one-time hint (curve-hint.tsx).

import {
  type KeyboardEvent,
  type RefObject,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import { formatPoiLabel } from "@/lib/calculator/poi/format";
import type { CalculatorEngine, EngineSnapshot } from "@/lib/calculator/core/api/engine";
import {
  defaultViewport,
  ZOOM_BUTTON_FACTOR,
  zoomViewport,
  type Viewport,
  type ViewSpec,
  worldToPx,
} from "@/lib/calculator/plot/viewport";
import { NAME_DEBOUNCE_MS, NAME_MAX_WAIT_MS } from "@/lib/calculator/render/constants";
import { pickGrid } from "@/lib/calculator/render/grid-plan";
import { GraphRenderer, readRenderTheme } from "@/lib/calculator/render/renderer";
import type { SkinId } from "@/lib/calculator/theme/skins";
import { useSkin } from "../hooks/skin";
import { useEngine, useEngineSnapshot } from "../hooks/use-engine";
import { countPlots, graphAccessibleName } from "./accessible-name";
import { createViewportAnimator, type ViewportAnimator } from "./animate-viewport";
import { homeFadeMs, useHomePresence, type HomePhase } from "./home-presence";
import { KeyboardTraceContext, type KeyboardTrace } from "./keyboard-trace";
import { CurveHint, useCurveHint } from "./curve-hint";
import { collectFitPoints, fitSearchView, fitViewport } from "./fit-view";
import { GraphFitGlyph, GraphHomeGlyph, GraphWrenchGlyph, GraphZoomGlyph } from "./graph-glyphs";
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
import { useLabelInk } from "./use-label-ink";
import { keepLabelsOpen, poiDots, shownLabels, usePoiLabels } from "./use-poi-labels";
import { shownPointLabels, usePointLabels } from "./use-point-labels";
import { useTrace, type TraceState } from "./use-trace";
import { insetHome, isInsetHome, raiseView, useInsetShift } from "./view-inset";

export { graphAccessibleName };

export interface GraphPanelProps {
  host: Element; // shadow host
  themeRevision: number; // bumped by the shell on prefers-contrast and forced-colors changes (TH-15)
  reducedMotion: boolean;
  settingsOpen: boolean;
  onOpenSettings(anchor: HTMLElement): void; // Settings control (L-1)
  pointer?: "fine" | "coarse"; // the curve hint's wording
  keypadInset?: number; // CSS px of the graph's bottom the open phone keypad covers
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
        trace: tr === null ? null : { x: tr.point.x, y: tr.point.y, color: tr.color },
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
      <GraphHomeGlyph />
    </button>
  );
}

/** The selected row's drawn vertices in CSS px, every 4th, for label placement (POI-19). */
const noTrace = () => () => undefined;

/** One viewport animator per engine, cancelled on unmount. */
function useViewportAnimator(engine: CalculatorEngine): ViewportAnimator {
  const animator = useMemo(() => createViewportAnimator(engine), [engine]);
  useEffect(() => () => animator.cancel(), [animator]);
  return animator;
}

/** POI-20: the keyboard trace's point as a drawn trace (dot and label), or null. */
function keyboardTracePoint(
  trace: KeyboardTrace | null,
  view: ViewSpec | null,
  rows: ReturnType<typeof buildRenderRows>
): TraceState | null {
  const at = trace?.state ?? null;
  if (at === null || view === null) return null;
  const [x, y] = worldToPx(view, at.x, at.y);
  const row = rows.find((r) => r.rowId === at.rowId);
  if (row === undefined) return null;
  const label = formatPoiLabel(at, view);
  return { x, y, point: { x: at.x, y: at.y }, label, opened: false, hole: false, color: row.color };
}

export function GraphPanel(props: GraphPanelProps): JSX.Element {
  const { host, themeRevision, reducedMotion, settingsOpen, onOpenSettings } = props;
  const inset = props.keypadInset ?? 0;
  const engine = useEngine();
  const snapshot = useEngineSnapshot(engine);
  const skin = useSkin();
  const panel = useRef<HTMLDivElement>(null);
  const layers = useRef<HTMLDivElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const homeRef = useRef<HTMLButtonElement>(null);
  const size = useGraphSize(layers, engine);
  const poi = usePoiLabels(snapshot, engine);
  const points = usePointLabels();
  const tracer = useTrace(engine);
  const keyboardTrace = useContext(KeyboardTraceContext);
  useSyncExternalStore(
    keyboardTrace === null ? noTrace : (l) => keyboardTrace.subscribe(l),
    () => keyboardTrace?.state ?? null
  );
  const current = useRef({ snapshot, skin, size, cache: NO_REGIONS });
  const readLabelInk = useLabelInk(current, panel, layers, host);
  /** The view and the drawn rows as of the latest commit, or null while unsized. */
  const scene = (): { view: ViewSpec; rows: ReturnType<typeof buildRenderRows> } | null => {
    const { snapshot: s, skin: k, size: g, cache: c } = current.current;
    if (g === null) return null;
    const v: ViewSpec = { viewport: s.viewport, size: g.size, dpr: g.dpr };
    return { view: v, rows: buildRenderRows(s, k, v, c) };
  };
  const locked = snapshot.settings.lockViewport; // SETTINGS-7, SETTINGS-20
  const input = useGraphInput({
    panel,
    surface,
    engine,
    size,
    locked,
    interaction: {
      press(at, pointer, event) {
        const sc = scene();
        if (sc === null) return "pan";
        if (poi.pressDot(at, pointer, sc.view)) {
          keepLabelsOpen(event);
          return "dot";
        }
        // The selected row's curve comes before a plotted point on it; a point before any other
        // curve (POI-LIVE-1: pressing a point on an unselected line opens the point's label).
        const selected = engine.getSnapshot().selectedRowId;
        const mine = sc.rows.filter((r) => r.rowId === selected);
        let claimed = mine.length > 0 ? tracer.claim(at, pointer, sc.view, mine) : null;
        if (claimed === null && points.press(at, pointer, sc.view, sc.rows)) {
          keepLabelsOpen(event);
          return "dot";
        }
        claimed ??= tracer.claim(at, pointer, sc.view, sc.rows);
        if (claimed === "trace") {
          keepLabelsOpen(event);
          return "trace";
        }
        poi.close(); // POI-TRACE-14: blank paper closes every label and deselects
        // POI-TRACE-2: with trace off a press on a curve only selected it, and pans.
        if (claimed === null) engine.setSelectedRow(null);
        return "pan";
      },
      move(at) {
        const sc = scene();
        if (sc !== null) tracer.move(at, sc.view);
      },
      release: tracer.release,
      hover(at) {
        poi.hover(at, scene()?.view ?? null);
      },
      viewChanged: poi.close,
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

  const drawnRows = view === null ? [] : buildRenderRows(snapshot, skin, view, cache);
  const { retrace } = tracer;
  useEffect(() => {
    if (view !== null) retrace(view); // POI-LIVE-12: the wheel zooms under a held trace
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the view's values, not its identity
  }, [retrace, snapshot.viewport, size]);
  const shownTrace = tracer.trace ?? keyboardTracePoint(keyboardTrace, view, drawnRows);
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
  const offDefault = size !== null && !isInsetHome(snapshot.viewport, size.size, inset);
  const phase = useHomePresence(offDefault, fadeMs);

  // GP-46, GP-47: the buttons and Home animate unless motion is reduced; a click during an
  // animation builds on its target.
  const animator = useViewportAnimator(engine);
  const animateTo = (next: (v: ViewSpec) => Viewport): void => {
    input.applyNow((v) => {
      const target = next({ ...v, viewport: animator.target() ?? v.viewport });
      if (reducedMotion) return target;
      poi.close();
      animator.run(target, false);
      return null;
    });
  };
  // The zoom buttons zoom about the middle of the visible graph, above any phone keypad.
  const zoom = (factor: number) =>
    animateTo((v) => {
      const { left, right, bottom, top } = v.viewport;
      const visible = Math.max(0, v.size.height - inset) / v.size.height;
      return zoomViewport(v.viewport, factor, {
        x: (left + right) / 2,
        y: top - ((top - bottom) * visible) / 2,
      });
    });
  const goHome = (): void => {
    surface.current?.focus({ preventScroll: true });
    animateTo((v) => insetHome(v.size, inset));
  };
  const fitAll = (): void =>
    animateTo((v) => {
      const search = fitSearchView(v, defaultViewport(v.size));
      const points = collectFitPoints(engine, engine.getSnapshot(), v, search);
      return fitViewport(points, v, inset) ?? v.viewport;
    });
  const fittable = snapshot.geometry.size > 0;
  useInsetShift(inset, size !== null, (px) => animateTo((v) => raiseView(v.viewport, v.size, px)));
  const hintRoot = useCallback(() => panel.current?.getRootNode() ?? null, []);
  const hint = useCurveHint(engine, snapshot, hintRoot, props.pointer !== "fine");

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
          labels={[
            ...shownPointLabels(points.open, drawnRows, view),
            ...shownLabels(snapshot, poi.labels, view),
          ]}
          size={view.size}
          readInk={readLabelInk}
          trace={shownTrace}
          onExport={(l) => poi.exportPoint(l.label, l.point)}
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
          <GraphWrenchGlyph />
        </button>
        {/* GP-41: one pill holding Zoom in and Zoom out, split by a 1 px rule; SETTINGS-7: none
            while the viewport is locked. */}
        {!locked && (
          <div className="kc-zoom-group" role="group" aria-label="Zoom">
            <button
              type="button"
              aria-label={GRAPH_CONTROL_LABELS.zoomIn}
              title={GRAPH_CONTROL_LABELS.zoomIn}
              onClick={() => zoom(ZOOM_BUTTON_FACTOR)}
            >
              <GraphZoomGlyph />
            </button>
            <button
              type="button"
              aria-label={GRAPH_CONTROL_LABELS.zoomOut}
              title={GRAPH_CONTROL_LABELS.zoomOut}
              onClick={() => zoom(1 / ZOOM_BUTTON_FACTOR)}
            >
              <GraphZoomGlyph out />
            </button>
          </div>
        )}
        {phase !== "absent" && !locked && (
          <HomeButton phase={phase} homeRef={homeRef} surface={surface} onActivate={goHome} />
        )}
        {fittable && !locked && (
          <button
            type="button"
            aria-label={GRAPH_CONTROL_LABELS.fit}
            title={GRAPH_CONTROL_LABELS.fit}
            data-graph-fit=""
            onClick={fitAll}
          >
            <GraphFitGlyph />
          </button>
        )}
      </div>
      {hint !== null && <CurveHint text={hint} insetPx={inset} />}
    </div>
  );
}
