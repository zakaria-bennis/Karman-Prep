"use client";
/*
 * The peeking companion on an end screen (the founder's peeking engine, companion/): it lives
 * behind the card and peeks out over the card's top edge, or from behind the score ring, then
 * celebrates. The layout it reads every frame lists those edges and every piece of text in the
 * card, and the engine keeps a clear gap from all of it, so it never covers text. It is never on a
 * question screen: only end screens use this. Still: it appears in place and holds still.
 */
import { useCallback, useEffect, useRef, type ReactNode } from "react";
import type { AnimalId } from "@/lib/rewards/catalog";
import { Companion, localRect, type CompanionApi } from "./companion/Companion";
import type { Layout, Rect, Spot } from "./companion/engine";
import { stillNow } from "./motion";
import s from "./rewards.module.css";

/** Everything in the card a reader reads or presses. */
const TEXT = "h1, h2, h3, p, li, a, button, label, small, b, .kp-num, .kp-big, [data-peek-keepout]";

/** The spots and keep-outs for a card inside `host` (pure geometry, so it can be tested). */
export function peekLayout(card: Rect, ring: Rect | null, text: Rect[]): Layout {
  const w = card.right - card.left;
  const spots: Record<string, Spot> = {
    bar: { rect: card, side: "top", at: card.left + w * 0.8 },
    top: { rect: card, side: "top", at: card.left + w * 0.2 },
  };
  if (ring) {
    const mid = (ring.top + ring.bottom) / 2;
    spots.edge = { rect: ring, side: "right", at: mid };
    spots.edgeL = { rect: ring, side: "left", at: mid };
  }
  return { spots, keepOut: text, avoid: text };
}

export function PeekStage({
  animal,
  perfect,
  children,
}: {
  animal: AnimalId;
  /** Every answer right: the biggest cheer. */
  perfect: boolean;
  children: ReactNode;
}) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<CompanionApi>(null);
  const cache = useRef<{ at: number; layout: Layout } | null>(null);

  const layout = useCallback((): Layout => {
    const now = performance.now();
    if (cache.current && now - cache.current.at < 16) return cache.current.layout;
    const h = host.current;
    const card = h?.querySelector(".kp-card");
    if (!h || !card) return { spots: {}, keepOut: [] };
    const ring = card.querySelector(".kp-ring");
    const text = Array.from(card.querySelectorAll(TEXT))
      .filter((el) => !(ring && ring.contains(el)))
      .map((el) => localRect(h, el))
      .filter((r) => r.right - r.left > 0 && r.bottom - r.top > 0);
    const out = peekLayout(localRect(h, card), ring ? localRect(h, ring) : null, text);
    cache.current = { at: now, layout: out };
    return out;
  }, []);

  useEffect(() => {
    // Wait for the cards to land, then pop out and cheer.
    const t = window.setTimeout(() => api.current?.results(perfect), stillNow() ? 50 : 900);
    return () => window.clearTimeout(t);
  }, [perfect]);

  return (
    <div ref={host} className={s.peekHost}>
      {children}
      <Companion ref={api} animal={animal} stage="kit" layout={layout} />
    </div>
  );
}
