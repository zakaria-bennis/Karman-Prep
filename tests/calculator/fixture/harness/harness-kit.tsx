// Harness kit for the calculator browser pages (01-interfaces-integration.md section 16; owner
// 07, used by the 08, 09 and 10 harness pages). mountHarness creates an engine, themes an open
// shadow root on the page's element with the skin's :host declarations and the page's CSS, and
// renders the page's React tree in it inside EngineContext and SkinContext. Browser specs read the
// engine through globalThis.__calculatorHarness.

import "katex/dist/katex.min.css";
import { createRoot } from "react-dom/client";
import { exposeEngineForTests } from "@/components/calculator/ui/hooks/dev-hooks";
import { SkinContext } from "@/components/calculator/ui/hooks/skin";
import { EngineContext } from "@/components/calculator/ui/hooks/use-engine";
import { createEngine, type CalculatorEngine } from "@/lib/calculator/core/api/engine";
import type { CalculatorOptions } from "@/lib/calculator/core/api/types";
import { hostThemeCss } from "@/lib/calculator/theme/roles";
import type { SkinId } from "@/lib/calculator/theme/skins";

export interface HarnessOptions {
  root: HTMLElement; // a shadow root is attached to it
  css: string[]; // CSS text imported with Vite's ?inline (declared in env.d.ts, owner 05)
  skin?: SkinId; // default "ivory"; installs hostThemeCss(skin) and provides SkinContext
  options?: CalculatorOptions;
  render(engine: CalculatorEngine): React.ReactNode;
}

/**
 * Mounts `render(engine)` in the shadow root of `options.root` (reusing one that is already
 * attached) with its own React root. `destroy()` unmounts it, destroys the engine, clears the
 * test hook and empties the shadow root, so the same element can be mounted again.
 */
export function mountHarness(options: HarnessOptions): {
  engine: CalculatorEngine;
  destroy(): void;
} {
  const skin = options.skin ?? "ivory";
  const shadow = options.root.shadowRoot ?? options.root.attachShadow({ mode: "open" });
  installCss(shadow, [hostThemeCss(skin), ...options.css].join("\n"));
  const engine = createEngine(options.options);
  const clearHook = exposeEngineForTests(engine);
  const reactRoot = createRoot(shadow);
  reactRoot.render(
    <EngineContext.Provider value={engine}>
      <SkinContext.Provider value={skin}>{options.render(engine)}</SkinContext.Provider>
    </EngineContext.Provider>
  );
  let destroyed = false;
  return {
    engine,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      reactRoot.unmount();
      engine.destroy();
      clearHook();
      shadow.replaceChildren();
      if ("adoptedStyleSheets" in shadow) shadow.adoptedStyleSheets = [];
    },
  };
}

/** One constructable sheet holding `css`, or a `<style>` element where those are unsupported. */
function installCss(shadow: ShadowRoot, css: string): void {
  if (
    typeof globalThis.CSSStyleSheet?.prototype?.replaceSync === "function" &&
    "adoptedStyleSheets" in shadow
  ) {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(css);
    shadow.adoptedStyleSheets = [sheet];
    return;
  }
  const style = document.createElement("style");
  style.textContent = css;
  shadow.append(style);
}
