// MathField harness page (05 Task 8): `?fields=<n, default 2>&maxLength=<n, default
// MAX_ROW_CHARACTERS>` mounts that many MathFields inside an open shadow root and records every
// callback and every non-modifier keydown on window.__mathFieldHarness. The page uses no React.
import "katex/dist/katex.min.css";
import tokensCss from "@/components/calculator/styles/tokens.css?inline";
import { createMathField, type MathField } from "@/components/calculator/math-field/MathField";
import { MAX_ROW_CHARACTERS } from "@/lib/calculator/core/latex";
import mathQuillCss from "../../../../vendor/mathquill/mathquill.css?inline";

export type HarnessEventType =
  | "edit"
  | "enter"
  | "arrow-out"
  | "delete-out"
  | "focus"
  | "blur"
  | "refused";
export interface HarnessEvent {
  field: number;
  type: HarnessEventType;
  detail: string | null;
}
export interface MathFieldHarness {
  fields: MathField[];
  events: HarnessEvent[];
  keydowns: string[]; // `${key}:${defaultPrevented}` of each keydown reaching the shadow root, except Control, Meta, Shift and Alt
  shadow: ShadowRoot;
}
declare global {
  interface Window {
    __mathFieldHarness?: MathFieldHarness;
  }
}

const ROW_CSS =
  ".row { display: block; padding: 8px; font: var(--kc-size-math) var(--kc-font-math); }";

const params = new URLSearchParams(location.search);
const fieldCount = Number(params.get("fields") ?? 2);
const maxLength = Number(params.get("maxLength") ?? MAX_ROW_CHARACTERS);

const shadow = document.getElementById("host")!.attachShadow({ mode: "open" });
const style = document.createElement("style");
style.textContent = [tokensCss, mathQuillCss, ROW_CSS].join("\n");
shadow.append(style);

const events: HarnessEvent[] = [];
const keydowns: string[] = [];
const fields: MathField[] = [];
for (let i = 0; i < fieldCount; i++) {
  const row = document.createElement("div");
  row.className = "row";
  row.dataset.field = String(i);
  shadow.append(row);
  const push = (type: HarnessEventType, detail: string | null = null) =>
    events.push({ field: i, type, detail });
  fields.push(
    createMathField(row, {
      ariaLabel: `Expression ${i + 1}`,
      maxLength,
      onEdit: (latex) => push("edit", latex),
      onEnter: () => push("enter"),
      onArrowOut: (direction) => push("arrow-out", direction),
      onDeleteOutOf: (direction) => push("delete-out", direction),
      onFocus: () => push("focus"),
      onBlur: () => push("blur"),
      onRefused: (reason) => push("refused", reason),
    })
  );
}

// Bubbling, so it runs after the textarea's own listeners and sees their preventDefault().
shadow.addEventListener("keydown", (e) => {
  const event = e as KeyboardEvent;
  // Playwright's press("Control+z") also sends a keydown for each modifier.
  if (["Control", "Meta", "Shift", "Alt"].includes(event.key)) return;
  keydowns.push(`${event.key}:${event.defaultPrevented}`);
});

window.__mathFieldHarness = { fields, events, keydowns, shadow };
document.body.dataset.ready = "true";
