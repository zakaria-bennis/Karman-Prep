// The calculator region (10 Task 4): the list, graph and keypad regions in that DOM order in both
// layouts (10 Decision 1), with the settings popover after them. L-1 and L-2 differ only in CSS
// grid areas keyed on data-kc-layout, so a layout switch never remounts a MathField (AR-26).
// rootRef lands on section.kc-app, where the shell installs its keyboard handling. A ResizeObserver
// on the list region keeps the focused or active row in view (L-14, 10 Decision 2), and focus
// entering the list closes the settings popover (10 Decision 7).

import { useEffect, useRef, type JSX, type Ref } from "react";
import { GraphPanel } from "../graph/GraphPanel";
import { Keypad } from "../keypad/Keypad";
import { ExpressionPanel } from "../list/ExpressionPanel";
import { SettingsPopover } from "../settings/SettingsPopover";
import { revealRow } from "./reveal-row";

export interface CalculatorLayoutProps {
  layout: "desktop" | "stacked";
  containerWidth: number;
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

  return (
    <section
      ref={props.rootRef}
      className="kc-app"
      role="region"
      aria-label="Graphing calculator"
      data-kc-layout={props.layout}
      data-collapsed={String(props.collapsed)}
      data-keypad={String(props.keypadOpen)}
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
      <div className="kc-graph-region">
        <GraphPanel
          host={props.host}
          themeRevision={props.themeRevision}
          reducedMotion={props.reducedMotion}
          settingsOpen={props.settingsAnchor !== null}
          onOpenSettings={props.onOpenSettings}
        />
      </div>
      <div className="kc-keypad-region">
        <Keypad
          containerWidth={props.containerWidth}
          pointer={props.pointer}
          open={props.keypadOpen}
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
