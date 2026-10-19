"use client";

// The quiz calculator seam (AR-9): CalculatorWindow with its once-per-page CalculatorLoader; the
// window's mode and geometry live in the page-session store (AR-25). Eager module: the calculator
// itself only via import() and types (AR-1).

import {
  Component,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type JSX,
  type PointerEvent,
  type ReactNode,
} from "react";
import { Calculator } from "lucide-react";
import { useQuizAnimations } from "@/components/learn/quiz/QuizTools";
import type { OpenTrigger, QuizCalculatorHandle } from "@/components/calculator/host/quiz-host"; // type-only (AR-1)
import { FULL_SCREEN_QUERY, PHONE_QUERY } from "./breakpoints";
import {
  CalculatorHostIdContext,
  CalculatorLoader,
  MOUNT_FAILED_COPY,
  getCalculatorModule,
} from "./CalculatorLoader";
import { CalculatorBridgeContext, useCalculator } from "./bridge-context";
import { CalculatorWindow } from "./CalculatorWindow";
import {
  DOCK_MARGIN,
  calculatorWindowStore,
  clampDockWidth,
  clampFloatingRect,
  defaultDockWidth,
  defaultFloatingRect,
  windowModeFor,
  type ViewportSize,
  type WindowRect,
} from "./calculator-window-store";
import { warmCalculatorFonts } from "./font-warmup";
import { reportCalculatorError } from "./report-error";
import { useTransferBridge, type TransferBridge } from "./use-transfer-bridge";
import "./calculator-chrome.generated.css"; // AR-37: the --kcc-* tokens of the window chrome
import styles from "./calculator.module.css";
import windowStyles from "./CalculatorWindow.module.css";

export type CalculatorLoadStatus = "idle" | "loading" | "ready" | "failed";
export type CalculatorLoadFailure = "load" | "mount"; // OI-28: import() rejected, or mount/API threw

export interface CalculatorScopeProps {
  enabled: boolean;
  open: boolean;
  onOpenChange(open: boolean): void;
  questionKey: string; // required: the value the host keys the scope by (makeQuestionKey in quiz hosts)
  dockTop?: number; // AR-24, default 12
  children: ReactNode;
}

export interface CalculatorBridge {
  open: boolean;
  status: CalculatorLoadStatus;
  failure: CalculatorLoadFailure | null; // non-null only while status is "failed"
  questionKey: string;
  toggle(trigger?: OpenTrigger): void;
  prefetch(): void; // getCalculatorModule() and warmCalculatorFonts()
  transfer: TransferBridge["transfer"]; // (payload, trigger) => Promise<TransferResult>, 14
}

export { useCalculator };

/** AR-53: a render error in the window keeps the question mounted and offers Retry, which
 * calls `onRetry`; the scope then remounts the window and loader under a new key. The fallback is
 * its own fixed box at the floating window's place and width, so it never fills the host's
 * positioned ancestor, and Close hides it; a later open retries. `onFailedChange` lets the scope
 * drop full screen's modal inertness while the fallback shows, so the question stays usable. */
class WindowBoundary extends Component<
  {
    open: boolean;
    rect: WindowRect;
    onRetry(): void;
    onClose(): void;
    onFailedChange(failed: boolean): void;
    children: ReactNode;
  },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    reportCalculatorError(error, null);
    this.props.onFailedChange(true);
  }

  componentDidUpdate(previous: { open: boolean }) {
    if (this.props.open && !previous.open && this.state.failed) this.retry();
  }

  retry() {
    this.setState({ failed: false });
    this.props.onFailedChange(false);
    this.props.onRetry();
  }

  render() {
    if (!this.state.failed) return this.props.children;
    const { x, y, width, height } = this.props.rect;
    return (
      <div
        className={windowStyles.fallback}
        data-calculator-window-fallback=""
        role="dialog"
        aria-label="Karman calculator"
        style={{ left: x, top: y, width, maxHeight: height }}
      >
        <p role="status">{MOUNT_FAILED_COPY}</p>
        <div className={windowStyles.fallbackActions}>
          <button type="button" onClick={() => this.retry()}>
            Retry
          </button>
          <button type="button" onClick={() => this.props.onClose()}>
            Close calculator
          </button>
        </div>
      </div>
    );
  }
}

/** The pointer type of the press that leads to a click; a keyboard activation has none (OI-7). */
function useOpenTriggerHandlers(toggle: (trigger?: OpenTrigger) => void) {
  const recorded = useRef<OpenTrigger | null>(null);
  return {
    onPointerDown(event: PointerEvent<HTMLButtonElement>) {
      const type = event.pointerType;
      recorded.current =
        type === "touch" || type === "pen" ? "touch" : type === "mouse" ? "mouse" : null;
    },
    onKeyDown() {
      recorded.current = null;
    },
    onClick() {
      const trigger = recorded.current ?? "keyboard";
      recorded.current = null;
      toggle(trigger);
    },
  };
}

/** The viewport the window's geometry is measured and clamped in. */
function viewportSize(): ViewportSize {
  return typeof window === "undefined"
    ? { width: 0, height: 0 }
    : { width: window.innerWidth, height: window.innerHeight };
}

/** The live viewport, refreshed on window and `visualViewport` resize (AR-22, L-6). */
function useViewport(): ViewportSize {
  const [viewport, setViewport] = useState<ViewportSize>(viewportSize);
  useEffect(() => {
    const update = () =>
      setViewport((previous) => {
        const next = viewportSize();
        return next.width === previous.width && next.height === previous.height ? previous : next;
      });
    update();
    const visual = window.visualViewport;
    window.addEventListener("resize", update);
    visual?.addEventListener("resize", update);
    return () => {
      window.removeEventListener("resize", update);
      visual?.removeEventListener("resize", update);
    };
  }, []);
  return viewport;
}

/** Whether focus can return to `element`: still in the document, rendered and not inert. */
function focusable(element: HTMLElement): boolean {
  return element.isConnected && element.getClientRects().length > 0 && !element.closest("[inert]");
}

/** Whether `query` (one of breakpoints.ts's, AR-19) matches now, following its changes. */
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const list = window.matchMedia(query);
    const update = () => setMatches(list.matches);
    update();
    list.addEventListener("change", update);
    return () => list.removeEventListener("change", update);
  }, [query]);
  return matches;
}

/** Key this scope by attempt + active question. Closing keeps this scope alive;
 * navigating destroys it, including pending clipboard work and native history. */
export function CalculatorScope({
  enabled,
  open,
  onOpenChange,
  questionKey,
  dockTop = 12,
  children,
}: CalculatorScopeProps): JSX.Element {
  const hostId = `karman-calculator-${useId().replace(/[^A-Za-z0-9_-]/g, "")}`;
  const reducedMotion = !useQuizAnimations();
  const phone = useMediaQuery(PHONE_QUERY);
  const fullScreen = useMediaQuery(FULL_SCREEN_QUERY); // AR-20, L-5
  const viewport = useViewport();
  const windowState = useSyncExternalStore(
    calculatorWindowStore.subscribe,
    calculatorWindowStore.get,
    calculatorWindowStore.get
  );
  const [activated, setActivated] = useState(open);
  // OI-3: true exactly when the lifted open state carried an open window into this question.
  const announceReset = useState(() => open)[0];
  const [status, setStatus] = useState<CalculatorLoadStatus>("idle");
  const [failure, setFailure] = useState<CalculatorLoadFailure | null>(null);
  const [handle, setHandle] = useState<QuizCalculatorHandle | null>(null);
  const [frame, setFrame] = useState<HTMLDivElement | null>(null);
  const [chromeSlot, setChromeSlot] = useState<HTMLDivElement | null>(null);
  const [windowAttempt, setWindowAttempt] = useState(0);
  const [windowFailed, setWindowFailed] = useState(false);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const chromeSlotRef = useRef<HTMLDivElement | null>(null);
  // The trigger of an open from closed; a scope mounted already open remembers none (AR-25).
  const remembered = useRef<OpenTrigger | null>(null);

  useEffect(() => {
    if (open) setActivated(true);
  }, [open]);

  // The window's frame and chrome slot for the loader, read again after a window Retry remount.
  const shown = activated || open;
  useLayoutEffect(() => {
    setFrame(frameRef.current);
    setChromeSlot(chromeSlotRef.current);
  }, [enabled, shown, windowAttempt]);

  // AN-10: the open animation runs only when this scope's window goes from closed to open with
  // motion allowed; any mode change or closing ends it, so Undock, Restore and AR-26 never replay it.
  const mode = windowModeFor(windowState, fullScreen);
  const previous = useRef({ open, mode });
  useLayoutEffect(() => {
    const before = previous.current;
    previous.current = { open, mode };
    const node = frameRef.current;
    if (!node) return;
    // Docked and maximized windows never animate (AN-10), so they are never marked entering.
    const animates = mode === "floating" || mode === "fullscreen";
    if (open && !before.open && !reducedMotion && animates) node.setAttribute("data-entering", "");
    else if (!open || mode !== before.mode) node.removeAttribute("data-entering");
  }, [open, mode, reducedMotion]);
  useEffect(() => {
    if (!frame) return;
    const finish = (event: AnimationEvent) => {
      if (event.target === frame) frame.removeAttribute("data-entering");
    };
    frame.addEventListener("animationend", finish);
    frame.addEventListener("animationcancel", finish);
    return () => {
      frame.removeEventListener("animationend", finish);
      frame.removeEventListener("animationcancel", finish);
    };
  }, [frame]);

  // AR-28, L-11: full screen is modal; the workspace is inert and hidden and the page cannot
  // scroll behind it, and the previous body overflow comes back on hide.
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const sideRef = useRef<HTMLButtonElement | null>(null);
  const modal = enabled && open && mode === "fullscreen" && !windowFailed;
  useLayoutEffect(() => {
    const node = workspaceRef.current;
    if (!modal || !node) return;
    const overflow = document.body.style.overflow;
    node.inert = true;
    document.body.style.overflow = "hidden";
    return () => {
      node.inert = false;
      document.body.style.overflow = overflow;
    };
  }, [modal]);

  // AR-27, L-10: an open remembers the element that had focus outside the window; a hide returns
  // focus to it while it is connected and visible, else to the toolbar button, else the side button.
  const opener = useRef<HTMLElement | null>(null);
  const wasOpen = useRef(open);
  useLayoutEffect(() => {
    const before = wasOpen.current;
    wasOpen.current = open;
    if (open && !before) {
      const active = document.activeElement;
      const inside = active !== null && frameRef.current?.contains(active) === true;
      if (!inside && active instanceof HTMLElement && active !== document.body) {
        opener.current = active;
      }
    } else if (!open && before) {
      const remembered = opener.current;
      opener.current = null;
      const target = [
        remembered,
        workspaceRef.current?.querySelector<HTMLElement>("[data-calculator-trigger]") ?? null,
        sideRef.current,
      ].find((element) => element !== null && focusable(element));
      target?.focus();
    }
  }, [open]);

  const toggle = (trigger?: OpenTrigger) => {
    if (open) {
      onOpenChange(false);
      return;
    }
    remembered.current = trigger ?? "keyboard";
    // L-4: the first open of a page session docks on a wide viewport; later opens restore the
    // floating or docked mode the student last chose.
    const stored = calculatorWindowStore.get();
    if (stored.mode === null && !fullScreen) {
      calculatorWindowStore.set({ mode: "docked", restoreMode: "docked" });
    } else {
      // Only floating or docked is restored, so a later open always recovers (AR-53).
      calculatorWindowStore.set({ mode: stored.restoreMode === "docked" ? "docked" : "floating" });
    }
    onOpenChange(true);
  };
  const prefetch = () => {
    void getCalculatorModule().catch(() => {});
    void warmCalculatorFonts();
  };
  const sideHandlers = useOpenTriggerHandlers(toggle);
  // 14: transfer(), its queue and the TR-67 status region text.
  const transferBridge = useTransferBridge({
    questionKey,
    open,
    status,
    failure,
    onOpenChange,
    frameRef,
  });
  const { transfer, openedByTransfer } = transferBridge;
  // Once per open: the calculator places focus for the trigger that opened it (OI-7), unless a
  // transfer opened it (TR-66). After the hook, so the opener memory runs before the drain.
  useEffect(() => {
    const trigger = remembered.current;
    if (!open || handle === null || trigger === null || openedByTransfer()) return;
    remembered.current = null;
    handle.focusOnOpen(trigger);
  }, [open, handle, openedByTransfer]);

  const bridge: CalculatorBridge | null = enabled
    ? { open, status, failure, questionKey, toggle, prefetch, transfer }
    : null;
  // Render-time clamping: the store keeps what the student set, so a shrink and regrow restores
  // the earlier place and dock width (AR-25).
  const floatingRect = clampFloatingRect(
    windowState.floatingRect ?? defaultFloatingRect(viewport),
    viewport
  );
  const dockWidth = clampDockWidth(
    windowState.dockWidth ?? defaultDockWidth(viewport.width),
    viewport.width
  );

  // AR-23, AR-24: while docked and open, the dock width plus a 12 px margin on each side shifts one
  // target right of the dock: a host ancestor marked data-calculator-dock-shift (the daily column,
  // set here and removed on undock, close, any other mode change and unmount), else the workspace,
  // which takes the single-column rule. No transition, so the width changes within one frame.
  const [shiftHost, setShiftHost] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => {
    const parent = workspaceRef.current?.parentElement ?? null;
    setShiftHost(parent?.closest<HTMLElement>("[data-calculator-dock-shift]") ?? null);
  }, []);
  const dockShift = enabled && open && mode === "docked" ? dockWidth + 2 * DOCK_MARGIN : null;
  useLayoutEffect(() => {
    if (shiftHost === null || dockShift === null) return;
    const marginLeft = shiftHost.style.marginLeft;
    shiftHost.setAttribute("data-calculator-docked", "true");
    shiftHost.style.marginLeft = `${dockShift}px`;
    return () => {
      shiftHost.removeAttribute("data-calculator-docked");
      shiftHost.style.marginLeft = marginLeft;
    };
  }, [shiftHost, dockShift]);
  const shiftWorkspace = dockShift !== null && shiftHost === null;

  return (
    <CalculatorBridgeContext.Provider value={bridge}>
      <CalculatorHostIdContext.Provider value={hostId}>
        <div
          ref={workspaceRef}
          className={styles.workspace}
          data-calculator-workspace=""
          aria-hidden={modal ? "true" : undefined}
          data-calculator-docked={shiftWorkspace ? "true" : undefined}
          style={
            shiftWorkspace
              ? {
                  display: "block",
                  position: "relative",
                  marginLeft: dockShift,
                  minHeight: "100%",
                  height: "100%",
                }
              : { display: "contents" }
          }
        >
          {children}
        </div>
        <div
          data-transfer-status
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {transferBridge.announcement}
        </div>
        {enabled && phone && !open && (
          <button
            type="button"
            ref={sideRef}
            className={styles.sideToggle}
            aria-label="Open Karman calculator"
            aria-expanded={open}
            aria-controls={hostId}
            {...sideHandlers}
          >
            <Calculator size={20} />
            <span>Calculator</span>
          </button>
        )}
        {enabled && shown && (
          <div data-calculator-root="" hidden={!open} data-reduced-motion={String(reducedMotion)}>
            <WindowBoundary
              open={open}
              rect={floatingRect}
              onRetry={() => setWindowAttempt((count) => count + 1)}
              onClose={() => onOpenChange(false)}
              onFailedChange={setWindowFailed}
            >
              <CalculatorWindow
                key={windowAttempt}
                mode={mode}
                dockTop={dockTop}
                dockWidth={dockWidth}
                floatingRect={floatingRect}
                onModeChange={(mode) => calculatorWindowStore.set({ mode })}
                onFloatingRectChange={(floatingRect) => calculatorWindowStore.set({ floatingRect })}
                onDockWidthChange={(dockWidth) => calculatorWindowStore.set({ dockWidth })}
                onClose={() => onOpenChange(false)}
                onMinimize={() => onOpenChange(false)}
                onFocusBoundary={(edge) => handle?.focusBoundary(edge)}
                frameRef={frameRef}
                chromeSlotRef={chromeSlotRef}
              >
                <CalculatorLoader
                  active
                  frame={frame}
                  chromeSlot={chromeSlot}
                  reducedMotion={reducedMotion}
                  announceReset={announceReset}
                  onStatus={(nextStatus, nextFailure) => {
                    setStatus(nextStatus);
                    setFailure(nextFailure);
                  }}
                  onHandle={(next) => {
                    setHandle(next);
                    transferBridge.onHandle(next);
                  }}
                />
              </CalculatorWindow>
            </WindowBoundary>
          </div>
        )}
      </CalculatorHostIdContext.Provider>
    </CalculatorBridgeContext.Provider>
  );
}

/** A11Y-7: names the shadow host it controls; hover and focus prefetch the module (AR-30). */
export function CalculatorTrigger(): JSX.Element | null {
  const bridge = useCalculator();
  const hostId = useContext(CalculatorHostIdContext);
  const handlers = useOpenTriggerHandlers(bridge?.toggle ?? noop);
  if (!bridge) return null;
  return (
    <button
      type="button"
      className={styles.trigger}
      aria-label="Toggle Karman calculator"
      aria-expanded={bridge.open}
      aria-controls={hostId}
      data-calculator-trigger=""
      onPointerEnter={bridge.prefetch}
      onFocus={bridge.prefetch}
      {...handlers}
    >
      <Calculator size={16} /> Calculator
    </button>
  );
}

function noop() {}
