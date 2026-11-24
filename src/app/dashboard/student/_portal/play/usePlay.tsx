"use client";
// A start page's player (split out of PlayLayer.tsx for speed, 2026-11-23). The quiz screen, the
// calculator and the endings are large; the portal now opens without them and fetches them in the
// background (preloadPlay, called once the portal is on screen), so Start does not wait for them.
import dynamic from "next/dynamic";
import { useCallback, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { PlayScope } from "@/lib/play/types";
import type { EndActions } from "./end-view";
import type { LocalQuestion } from "./LocalPlay";

const load = () => import("./PlayLayer");
const LazyPlayLayer = dynamic(() => load().then((m) => m.PlayLayer), { ssr: false });

/** Fetches the player's code ahead of the first Start. Safe to call more than once. */
export function preloadPlay() {
  load().catch(() => {
    // fetched again on the first Start
  });
}

export type PlayRequest =
  | { kind: "set"; skillId: string; skill: string }
  | { kind: "daily" }
  | { kind: "endless"; scope: PlayScope }
  /** Mistakes to review, or (`setId`) a curated review set the tutor sent. */
  | { kind: "review"; skillId?: string; questionIds?: string[]; setId?: string }
  | { kind: "trial"; scope: PlayScope }
  | { kind: "challenge"; noWorld?: boolean }
  | { kind: "strategy"; skillId: string; skill: string; questions: LocalQuestion[] }
  /** The design page (no student signed in): made-up questions, a made-up ending. */
  | { kind: "demo"; title: string; questions: LocalQuestion[] };

/** A start page's player: `play(request, startButton)` opens an activity over the portal. */
export function usePlay(
  actions?: Omit<EndActions, "done">,
  /** Called when the layer closes; `finished` when the activity reached its ending. */
  onClosed?: (finished: boolean) => void
) {
  const [now, setNow] = useState<{
    request: PlayRequest;
    from: DOMRect | null;
    intro?: (start: (from?: Element | null) => void) => ReactNode;
  } | null>(null);
  const play = useCallback(
    (
      request: PlayRequest,
      from?: Element | null,
      intro?: (start: (from?: Element | null) => void) => ReactNode
    ) => {
      setNow({ request, from: from?.getBoundingClientRect() ?? null, intro });
    },
    []
  );
  // on the page's body, so no moving or clipped parent (a sliding skill page) holds it in
  const layer = now
    ? createPortal(
        <LazyPlayLayer
          key={JSON.stringify(now.request)}
          request={now.request}
          from={now.from}
          intro={now.intro}
          actions={actions}
          onClose={(finished) => {
            setNow(null);
            onClosed?.(finished);
          }}
        />,
        document.body
      )
    : null;
  return { layer, play, playing: now?.request ?? null, close: () => setNow(null) };
}
