// The companion never covers text: for any layout, a spot is only used when the companion can
// rise out of its edge and still keep a clear gap from every piece of text in its way.
import { describe, expect, it } from "vitest";
import { STAGES } from "../animals";
import { peekLayout } from "../PeekStage";
import {
  GAP,
  HEAD_H,
  MIN_PEEK,
  anchorOf,
  capFor,
  createState,
  validSpot,
  type Engine,
  type Layout,
  type Rect,
} from "./engine";

const W = 600;
const H = 700;

function engine(layout: Layout): Engine {
  return {
    M: createState("fox", "kit", () => layout),
    svg: null as unknown as SVGSVGElement,
    host: () => ({ w: W, h: H }),
    local: (r) => ({ left: r.left, top: r.top, right: r.right, bottom: r.bottom }),
  };
}

/** How far the head reaches out of its edge at the highest peek the engine allows. */
function reach(cap: number) {
  return HEAD_H * STAGES.kit.head * Math.min(1.08, cap);
}

/**
 * Whether the head, risen to `cap`, comes within GAP of the rect in its lane. A line that crosses
 * the edge by under a pixel counts as inside the element (the engine's own tolerance).
 */
function covers(layout: Layout, name: string, cap: number, r: Rect): boolean {
  const sp = layout.spots[name];
  const a = anchorOf(sp);
  const half = 64;
  const d = reach(cap);
  if (sp.side === "top")
    return (
      r.right > a.x - half && r.left < a.x + half && r.bottom > a.y - d - GAP + 1 && r.top < a.y - 1
    );
  if (sp.side === "right")
    return (
      r.bottom > a.y - half && r.top < a.y + half && r.left < a.x + d + GAP - 1 && r.right > a.x + 1
    );
  if (sp.side === "left")
    return (
      r.bottom > a.y - half && r.top < a.y + half && r.right > a.x - d - GAP + 1 && r.left < a.x - 1
    );
  return (
    r.right > a.x - half && r.left < a.x + half && r.top < a.y + d + GAP - 1 && r.bottom > a.y + 1
  );
}

describe("companion placement", () => {
  it("rises fully over a card edge with nothing above it", () => {
    const card = { left: 20, top: 90, right: 580, bottom: 600 };
    const text = [{ left: 60, top: 120, right: 540, bottom: 150 }];
    const L = peekLayout(card, null, text);
    expect(validSpot(engine(L), "bar")).not.toBeNull();
    expect(capFor(engine(L).M, L.spots.bar, L.keepOut)).toBeGreaterThanOrEqual(1);
  });

  it("refuses an edge with a line of text just above it", () => {
    const card = { left: 20, top: 90, right: 580, bottom: 600 };
    const title = { left: 20, top: 60, right: 580, bottom: 84 };
    const L = peekLayout(card, null, [title]);
    expect(validSpot(engine(L), "bar")).toBeNull();
    expect(validSpot(engine(L), "top")).toBeNull();
  });

  it("refuses a side of the ring that has text beside it", () => {
    const card = { left: 20, top: 90, right: 580, bottom: 600 };
    const ring = { left: 230, top: 160, right: 370, bottom: 300 };
    const beside = { left: 390, top: 200, right: 560, bottom: 222 };
    const L = peekLayout(card, ring, [beside]);
    expect(validSpot(engine(L), "edge")).toBeNull();
    expect(validSpot(engine(L), "edgeL")).not.toBeNull();
  });

  it("never comes within the gap of any text, over many random layouts", () => {
    let seed = 42;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let n = 0; n < 400; n++) {
      const card = { left: 10, top: 40 + rnd() * 80, right: W - 10, bottom: H - 10 };
      const size = 80 + rnd() * 80;
      const cx = 150 + rnd() * 300;
      const cy = card.top + 120 + rnd() * 200;
      const ring = {
        left: cx - size / 2,
        top: cy - size / 2,
        right: cx + size / 2,
        bottom: cy + size / 2,
      };
      const text: Rect[] = Array.from({ length: 1 + Math.floor(rnd() * 6) }, () => {
        const x = rnd() * (W - 80);
        const y = rnd() * (H - 30);
        return { left: x, top: y, right: x + 30 + rnd() * 220, bottom: y + 14 + rnd() * 20 };
      });
      const L = peekLayout(card, ring, text);
      const E = engine(L);
      for (const name of Object.keys(L.spots)) {
        if (!validSpot(E, name)) continue;
        const cap = capFor(E.M, L.spots[name], L.keepOut);
        expect(cap).toBeGreaterThanOrEqual(MIN_PEEK);
        for (const r of text) expect(covers(L, name, cap, r)).toBe(false);
      }
    }
  });
});
