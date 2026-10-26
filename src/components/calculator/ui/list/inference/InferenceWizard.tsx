// FN-59: the inference wizard, as on live Desmos (College Board version, captured 2026-10-26). Add
// item's "inference" adds an empty row (as Add expression does) and opens the wizard beside it,
// over the graph, which a translucent cover dims. Its start screen offers Probability Distribution,
// then "Inference for Quantitative Data:" z-test and t-test, and "Inference for Categorical Data:"
// z-test for proportions, χ² test for independence and χ² goodness of fit test; each opens its
// form (WizardForms.tsx) under a header with a Back button. Create writes the row and focuses it
// with the caret at the end; the close button, Escape (one KB-3 layer) and a press on the cover
// close the wizard and leave the empty row, as Desmos does. A dialog: focus starts on its first
// button or cell and Tab stays inside it.

import {
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type JSX,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { EscapeContext } from "../../focus/escape-stack";
import { FocusContext } from "../../focus/focus-controller";
import { useEngine } from "../../hooks/use-engine";
import { fixAt } from "./fixed-position";
import { DistributionForm, FitForm, IndependenceForm, SampleForm } from "./WizardForms";

type Screen = "start" | "distribution" | "z" | "t" | "zprop" | "chiind" | "chigof";

const TITLES: Readonly<Record<Exclude<Screen, "start">, JSX.Element>> = {
  distribution: <>Probability Distribution</>,
  z: (
    <>
      <var>z</var>-test
    </>
  ),
  t: (
    <>
      <var>t</var>-test
    </>
  ),
  zprop: (
    <>
      <var>z</var>-test for proportions
    </>
  ),
  chiind: (
    <>
      <var>χ</var>
      <sup>2</sup> test for independence
    </>
  ),
  chigof: (
    <>
      <var>χ</var>
      <sup>2</sup> goodness of fit test
    </>
  ),
};

const SPOKEN: Readonly<Record<Exclude<Screen, "start">, string>> = {
  distribution: "Probability Distribution",
  z: "z-test",
  t: "t-test",
  zprop: "z-test for proportions",
  chiind: "chi-squared test for independence",
  chigof: "chi-squared goodness of fit test",
};

const FOCUSABLE =
  "button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex='-1'])";

/**
 * Where the wizard sits: beside the list over the graph (desktop), or over the calculator; the
 * cover dims the same area, and the close button sits at its top right.
 */
function place(
  box: HTMLElement,
  cover: HTMLElement,
  close: HTMLElement,
  rowId: string,
  app: Element
): void {
  const graph = app.querySelector(".kc-graph-region");
  const row = app.querySelector(`[data-row-id="${CSS.escape(rowId)}"]`);
  const a = app.getBoundingClientRect();
  const g = graph?.getBoundingClientRect();
  const desktop = app.getAttribute("data-kc-layout") === "desktop" && g !== undefined;
  const width = box.offsetWidth,
    height = box.offsetHeight;
  if (desktop) {
    const top = Math.min(Math.max(row?.getBoundingClientRect().top ?? g.top, g.top + 8), a.bottom - height - 8); // prettier-ignore
    fixAt(box, g.left + 12, Math.max(a.top + 8, top));
  } else {
    fixAt(box, a.left + Math.max(8, (a.width - width) / 2), a.top + Math.max(8, Math.min(60, a.height - height - 8))); // prettier-ignore
  }
  box.dataset.placement = desktop ? "beside" : "over";
  const area = desktop ? g : a;
  cover.style.width = `${area.width}px`;
  cover.style.height = `${area.height}px`;
  fixAt(cover, area.left, area.top);
  // as on Desmos, the close button sits just off the box's top right corner
  const b = box.getBoundingClientRect();
  fixAt(close, Math.min(b.right - 8, area.right - 40), Math.max(area.top + 2, b.top - 29));
}

export function InferenceWizard(props: {
  rowId: string;
  anchor: HTMLElement | null; // an element inside the calculator, to find its root
  onClose(): void;
}): JSX.Element | null {
  const engine = useEngine();
  const focus = useContext(FocusContext)!;
  const escape = useContext(EscapeContext);
  const [screen, setScreen] = useState<Screen>("start");
  const [app, setApp] = useState<Element | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const cover = useRef<HTMLDivElement>(null);
  const closer = useRef<HTMLButtonElement>(null);
  const latest = useRef(props.onClose);
  latest.current = props.onClose;

  useLayoutEffect(() => setApp(props.anchor?.closest(".kc-app") ?? null), [props.anchor]);
  useLayoutEffect(() => {
    if (box.current === null || cover.current === null || closer.current === null || app === null)
      return;
    place(box.current, cover.current, closer.current, props.rowId, app);
  });
  useLayoutEffect(() => {
    if (screen === "start") box.current?.querySelector<HTMLElement>(".kc-wiz-choice")?.focus();
  }, [screen, app]);
  useEffect(() => {
    if (escape === null) return;
    return escape.push({ id: "inference-wizard", close: () => latest.current() });
  }, [escape]);

  if (app === null) return null;

  const create = (latex: string) => {
    engine.editRow(props.rowId, latex, "paste");
    props.onClose();
    focus.focusRow(props.rowId, "end");
  };
  // Tab and Shift+Tab stay inside the dialog
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab" || box.current === null) return;
    const items = [...box.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    if (items.length === 0) return;
    const root = box.current.getRootNode() as Document | ShadowRoot;
    const at = items.findIndex(
      (el) => el === root.activeElement || el.contains(root.activeElement)
    );
    const next = e.shiftKey ? (at <= 0 ? items.length - 1 : at - 1) : at === items.length - 1 ? 0 : at + 1; // prettier-ignore
    if ((e.shiftKey && at <= 0) || (!e.shiftKey && at === items.length - 1)) {
      e.preventDefault();
      items[next].focus();
    }
  };
  const choice = (to: Exclude<Screen, "start">, wide = false) => (
    <button
      type="button"
      className="kc-wiz-choice"
      data-wide={wide ? "true" : undefined}
      onClick={() => setScreen(to)}
    >
      {TITLES[to]}
    </button>
  );
  const label = screen === "start" ? "Add inference" : SPOKEN[screen];
  return createPortal(
    <>
      <div
        ref={cover}
        className="kc-wiz-cover"
        aria-hidden="true"
        onPointerDown={() => props.onClose()}
      />
      <button
        ref={closer}
        type="button"
        className="kc-wiz-close"
        aria-label="Close dialog"
        onClick={() => props.onClose()}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <path d="M3 3l10 10M13 3 3 13" />
        </svg>
      </button>
      <div
        ref={box}
        className="kc-wiz"
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onKeyDown={onKeyDown}
      >
        {screen === "start" ? (
          <div className="kc-wiz-start">
            {choice("distribution", true)}
            <div className="kc-wiz-or" aria-hidden="true">
              <span>or</span>
            </div>
            <h3 className="kc-wiz-heading">Inference for Quantitative Data:</h3>
            <div className="kc-wiz-choices" data-columns="2">
              {choice("z")}
              {choice("t")}
            </div>
            <h3 className="kc-wiz-heading">Inference for Categorical Data:</h3>
            <div className="kc-wiz-choices">
              {choice("zprop")}
              {choice("chiind")}
              {choice("chigof")}
            </div>
          </div>
        ) : (
          <>
            <header className="kc-wiz-header">
              <button
                type="button"
                className="kc-wiz-back"
                aria-label="Back"
                onClick={() => setScreen("start")}
              >
                <svg viewBox="0 0 10 16" aria-hidden="true" focusable="false">
                  <path d="M7.5 2.5 2 8l5.5 5.5" />
                </svg>
              </button>
              <h2 className="kc-wiz-title">{TITLES[screen]}</h2>
            </header>
            {screen === "distribution" && <DistributionForm onCreate={create} />}
            {(screen === "z" || screen === "t" || screen === "zprop") && (
              <SampleForm key={screen} kind={screen} onCreate={create} />
            )}
            {screen === "chiind" && <IndependenceForm onCreate={create} />}
            {screen === "chigof" && <FitForm onCreate={create} />}
          </>
        )}
      </div>
    </>,
    app
  );
}
