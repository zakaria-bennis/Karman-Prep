// Graph presses for the calculator specs (poi-live.spec.ts, graph-ux.spec.ts): world points to
// page pixels, and a Finger that presses with the mouse on desktop and a real touch on touch
// projects (CDP in Chromium, touch pointer events in WebKit).

import type { CDPSession, Page } from "@playwright/test";

export type Pt = readonly [number, number];

/** Page coordinates of the world point (x, y) on the graph, in whole pixels. */
export async function at(page: Page, x: number, y: number): Promise<[number, number]> {
  const box = (await page.locator("#calc [data-graph-layers]").boundingBox())!;
  const view = await page.evaluate(
    () => globalThis.__calculatorHarness!.engine.getSnapshot().view!
  );
  const { left, right, bottom, top } = view.viewport;
  return [
    Math.round(box.x + ((x - left) / (right - left)) * view.size.width),
    Math.round(box.y + ((top - y) / (top - bottom)) * view.size.height),
  ];
}

/**
 * A press, moves and a release on the graph: the mouse on desktop; on touch projects a real touch
 * through CDP in Chromium, and touch pointer events on the panel in WebKit (which has no CDP).
 */
export class Finger {
  private cdp: CDPSession | null = null;
  constructor(
    private page: Page,
    private touch: boolean,
    private browser: string
  ) {}
  private async touchEvent(type: "touchStart" | "touchMove" | "touchEnd", p: Pt | null, id = 1) {
    if (this.browser === "chromium") {
      this.cdp ??= await this.page.context().newCDPSession(this.page);
      await this.cdp.send("Input.dispatchTouchEvent", {
        type,
        touchPoints: p === null ? [] : [{ x: p[0], y: p[1], id }],
      });
      return;
    }
    const kind = { touchStart: "pointerdown", touchMove: "pointermove", touchEnd: "pointerup" }[
      type
    ]!;
    await this.page.evaluate(
      ([kind, x, y, id]) => {
        const root = document.querySelector("#calc")!.shadowRoot!;
        const panel = root.querySelector<HTMLElement>("[data-graph-panel]")!;
        const target = kind === "pointerdown" ? (root.elementFromPoint(x, y) ?? panel) : panel;
        target.dispatchEvent(
          new PointerEvent(kind, {
            pointerId: id,
            pointerType: "touch",
            isPrimary: id === 1,
            button: 0,
            buttons: kind === "pointerup" ? 0 : 1,
            clientX: x,
            clientY: y,
            bubbles: true,
            composed: true,
          })
        );
      },
      [kind, p?.[0] ?? 0, p?.[1] ?? 0, id] as const
    );
  }
  private last: Pt = [0, 0];
  async down(p: Pt) {
    this.last = p;
    if (!this.touch) {
      await this.page.mouse.move(p[0], p[1]);
      await this.page.mouse.down();
    } else await this.touchEvent("touchStart", p);
  }
  async move(p: Pt) {
    this.last = p;
    if (!this.touch) await this.page.mouse.move(p[0], p[1]);
    else await this.touchEvent("touchMove", p);
  }
  async up() {
    if (!this.touch) await this.page.mouse.up();
    else await this.touchEvent("touchEnd", this.browser === "chromium" ? null : this.last);
  }
  async tap(p: Pt) {
    await this.down(p);
    await this.up();
  }
}
