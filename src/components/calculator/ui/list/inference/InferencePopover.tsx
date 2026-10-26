// A small popover for an inference row's numerical outputs: a row clips its overflow, so the box
// is portalled into the calculator root and placed with position: fixed below its anchor's right
// edge (above it when there is no room), kept 2 px inside the root. Escape (one KB-3 layer) and a
// press outside close it; Escape returns focus to the anchor.

import {
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type JSX,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { EscapeContext } from "../../focus/escape-stack";
import { fixAt } from "./fixed-position";

const GAP = 6;
const EDGE = 2;

export function InferencePopover(props: {
  anchor: RefObject<HTMLElement | null>;
  label: string;
  onClose(refocus: boolean): void;
  children: ReactNode;
}): JSX.Element | null {
  const ref = useRef<HTMLDivElement>(null);
  const escape = useContext(EscapeContext);
  const [layer, setLayer] = useState<Element | null>(null);
  const latest = useRef(props.onClose);
  latest.current = props.onClose;

  useLayoutEffect(() => {
    setLayer(props.anchor.current?.closest(".kc-app") ?? null);
  }, [props.anchor]);

  useLayoutEffect(() => {
    const box = ref.current,
      anchor = props.anchor.current;
    if (box === null || anchor === null || layer === null) return;
    const a = anchor.getBoundingClientRect(),
      l = layer.getBoundingClientRect();
    const left = Math.max(l.left + EDGE, Math.min(a.right - box.offsetWidth, l.right - box.offsetWidth - EDGE)); // prettier-ignore
    let top = a.bottom + GAP;
    if (top + box.offsetHeight > l.bottom - EDGE) top = Math.max(l.top + EDGE, a.top - GAP - box.offsetHeight); // prettier-ignore
    fixAt(box, left, top);
    box.querySelector<HTMLElement>("button")?.focus({ preventScroll: true });
  }, [layer, props.anchor]);

  useEffect(() => {
    if (escape === null) return;
    return escape.push({ id: "inference-outputs", close: () => latest.current(true) });
  }, [escape]);

  useEffect(() => {
    const box = ref.current;
    const root = box?.getRootNode() as Document | ShadowRoot | undefined;
    if (box === null || root === undefined) return;
    const onPress = (e: Event) => {
      const path = e.composedPath();
      if (path.includes(box) || (props.anchor.current && path.includes(props.anchor.current)))
        return;
      latest.current(false);
    };
    root.addEventListener("pointerdown", onPress, { capture: true });
    return () => root.removeEventListener("pointerdown", onPress, { capture: true });
  }, [layer, props.anchor]);

  if (layer === null) return null;
  return createPortal(
    <div ref={ref} className="kc-inf-popover" role="dialog" aria-label={props.label}>
      {props.children}
    </div>,
    layer
  );
}
