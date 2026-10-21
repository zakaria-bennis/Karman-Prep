// The calculator region: the list, graph and keypad regions in that DOM order in both
// layouts, with the settings popover after them. L-1 and L-2 differ only in CSS
// grid areas keyed on data-kc-layout, so a layout switch never remounts a MathField (AR-26).
// rootRef lands on section.kc-app, where the shell installs its keyboard handling. A ResizeObserver
// on the list region keeps the focused or active row in view (L-14), and focus
// entering the list closes the settings popover. A mousedown in the keypad region
// while a row has focus is cancelled, so focus and caret stay in the row (K-12). On a phone the
// open keypad keeps the graph in view, and upright the graph grows while the keypad is a bar
// (phone-keypad.ts).

import { useEffect, useRef, type JSX, type Ref } from "react";
import { GraphPanel } from "../graph/GraphPanel";
import { useEngine } from "../hooks/use-engine";
import { Keypad } from "../keypad/Keypad";
import { ExpressionPanel } from "../list/ExpressionPanel";
import { SettingsPopover } from "../settings/SettingsPopover";
import { ListResizer, useListWidth } from "./ListResizer";
import { phoneKeypadState, usePhoneKeypad } from "./phone-keypad";
import { revealRow } from "./reveal-row";

export interface CalculatorLayoutProps {
  layout: "desktop" | "stacked";
  containerWidth: number;
  containerHeight?: number;
  pointer: "fine" | "coarse";
  collapsed: boolean;
  keypadOpen: boolean;
  host: Element;
  themeRevision: number;
  reducedMotion: boolean;
  settingsAnchor: HTMLElement | null;
  revealRowId: string | null; // focusedRowId ?? activeRowId; Task 6 keeps it in view (L-14)
  rootRef: Ref<HTMLElement>; // on section.kc-app; Task 9 installs the keyboard handler on it
  onOpenSettings(anchor: HTMLElement): void;
  onCloseSettings(): void;
  onToggleKeypad(): void;
  onKeypadChange(open: boolean, by: "student" | "system"): void;
  onTouchFocusRow(rowId: string): void;
}

export function CalculatorLayout(props: CalculatorLayoutProps): JSX.Element {
  const listRegion = useRef<HTMLDivElement>(null);
  const latestRevealRowId = useRef(props.revealRowId);
  latestRevealRowId.current = props.revealRowId;

  useEffect(() => {
    const region = listRegion.current;
    if (region === null) return;
    const observer = new ResizeObserver(() => revealRow(region, latestRevealRowId.current));
    observer.observe(region);
    return () => observer.disconnect();
  }, []);

  // K-12: the keys prevent mousedown (K-10); the region extends that to its other controls, such
  // as Show keypad. A touch tap's compatibility mousedown takes the same path.
  const listWidth = useListWidth(props.containerWidth, props.containerHeight ?? Infinity);
  const resizable = props.layout === "desktop" && !props.collapsed;

  // RS (responsive.md): a touch calculator under 450 by 495 px is a phone; it drops the zoom buttons.
  const phone =
    props.pointer === "coarse" &&
    (props.containerWidth < 450 || (props.containerHeight ?? Infinity) < 495);
  const engine = useEngine();
  const graphRegion = useRef<HTMLDivElement>(null);
  const keypadRegion = useRef<HTMLDivElement>(null);
  const phoneKeypad = usePhoneKeypad({
    phone,
    keypadOpen: props.keypadOpen,
    engine,
    graph: graphRegion,
    keypad: keypadRegion,
    sizeKey: `${props.layout} ${props.containerWidth} ${props.containerHeight}`,
  });

  const rowFocused = () => props.host.shadowRoot!.activeElement?.closest("[data-row-id]") != null;

  return (
    <section
      ref={props.rootRef}
      className="kc-app"
      role="region"
      aria-label="Graphing calculator"
      data-kc-layout={props.layout}
      data-collapsed={String(props.collapsed)}
      data-keypad={String(props.keypadOpen)}
      data-compact-touch={phone ? "true" : undefined}
      data-phone-keypad={phoneKeypadState({
        phone,
        layout: props.layout,
        keypadOpen: props.keypadOpen,
        minimized: phoneKeypad.minimized,
      })}
      style={props.layout === "desktop" ? listWidth.style : undefined}
    >
      <div
        ref={listRegion}
        className="kc-list-region"
        onFocus={() => {
          if (props.settingsAnchor !== null) props.onCloseSettings();
        }}
      >
        <ExpressionPanel
          layout={props.layout}
          pointer={props.pointer}
          keypadOpen={props.keypadOpen}
          onToggleKeypad={props.onToggleKeypad}
          onTouchFocusRow={props.onTouchFocusRow}
        />
      </div>
      {resizable && (
        <ListResizer
          width={listWidth.width}
          containerWidth={props.containerWidth}
          onResize={listWidth.setWidth}
        />
      )}
      <div
        ref={graphRegion}
        className="kc-graph-region"
        onPointerDownCapture={phoneKeypad.onGraphPointerDown}
      >
        <GraphPanel
          host={props.host}
          themeRevision={props.themeRevision}
          reducedMotion={props.reducedMotion}
          settingsOpen={props.settingsAnchor !== null}
          onOpenSettings={props.onOpenSettings}
          pointer={props.pointer}
          keypadInset={phoneKeypad.keypadInset}
        />
      </div>
      <div
        ref={keypadRegion}
        className="kc-keypad-region"
        onMouseDownCapture={(e) => {
          if (rowFocused()) e.preventDefault(); // K-12: focus and caret stay in the row
        }}
      >
        <Keypad
          containerWidth={props.containerWidth}
          layout={props.layout}
          pointer={props.pointer}
          open={props.keypadOpen}
          minimized={phoneKeypad.minimized}
          onRestore={phoneKeypad.restore}
          onOpenChange={props.onKeypadChange}
        />
      </div>
      <SettingsPopover
        anchor={props.settingsAnchor}
        open={props.settingsAnchor !== null}
        onClose={props.onCloseSettings}
      />
    </section>
  );
}
