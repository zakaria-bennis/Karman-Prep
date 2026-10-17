// The calculator's one polite status region and the announcer that writes
// into it (01 section 9). A11Y-2, AN-13 and AN-14 are verified by 09 and 10
// against the rendered calculator; this module only pins the timing contract.
//
// Timing: announce(text, { delayMs, key }) schedules two timers, a clear at
// max(0, delayMs - CLEAR_MS) and a write at max(delayMs, CLEAR_MS). The text
// lands exactly delayMs after the call when delayMs >= CLEAR_MS (else at
// CLEAR_MS), and the region is empty for CLEAR_MS before every write, so equal
// text is read again. A key covers both timers of its entry: a same-key
// announce or cancel(key) stops whichever has not run. Entries without a key
// stop only on destroy(). Every timer takes a function argument (AR-44).
//
// No JSX: the live region is built with createElement so this stays a .ts file.

import {
  createContext,
  createElement,
  useContext,
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type JSX,
} from "react";

const CLEAR_MS = 50;

export interface AnnounceOptions {
  delayMs?: number;
  key?: string;
} // same key replaces a pending one

export interface Announcer {
  announce(text: string, options?: AnnounceOptions): void;
  cancel(key: string): void;
  destroy(): void;
}

type Timer = ReturnType<typeof setTimeout>;

interface Entry {
  key: string | undefined;
  clear: Timer | null;
  write: Timer | null;
}

/** Writes into `region`, which the caller renders with role="status", aria-live="polite". */
export function createAnnouncer(region: HTMLElement): Announcer {
  const pending = new Set<Entry>();
  const byKey = new Map<string, Entry>();
  let destroyed = false;

  function stop(entry: Entry): void {
    if (entry.clear !== null) clearTimeout(entry.clear);
    if (entry.write !== null) clearTimeout(entry.write);
    entry.clear = null;
    entry.write = null;
    pending.delete(entry);
    if (entry.key !== undefined && byKey.get(entry.key) === entry) byKey.delete(entry.key);
  }

  return {
    announce(text, options = {}) {
      if (destroyed) return;
      const { delayMs = 0, key } = options;
      if (key !== undefined) {
        const previous = byKey.get(key);
        if (previous) stop(previous);
      }
      const entry: Entry = { key, clear: null, write: null };
      entry.clear = setTimeout(
        () => {
          entry.clear = null;
          region.textContent = "";
        },
        Math.max(0, delayMs - CLEAR_MS)
      );
      entry.write = setTimeout(
        () => {
          entry.write = null;
          stop(entry);
          region.textContent = text;
        },
        Math.max(delayMs, CLEAR_MS)
      );
      pending.add(entry);
      if (key !== undefined) byKey.set(key, entry);
    },
    cancel(key) {
      if (destroyed) return;
      const entry = byKey.get(key);
      if (entry) stop(entry);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      for (const entry of [...pending]) stop(entry);
      region.textContent = "";
    },
  };
}

export const AnnouncerContext = createContext<Announcer | null>(null);

export function useAnnouncer(): Announcer {
  const announcer = useContext(AnnouncerContext);
  if (announcer === null) throw new Error("useAnnouncer must be used inside AnnouncerContext");
  return announcer;
}

const VISUALLY_HIDDEN: CSSProperties = {
  position: "absolute",
  width: "1px",
  height: "1px",
  overflow: "hidden",
  clipPath: "inset(50%)",
  whiteSpace: "nowrap",
};

/** One polite status region (never an alert); calls onReady once with its element. */
export function LiveRegion(props: { onReady(region: HTMLElement): void }): JSX.Element {
  const regionRef = useRef<HTMLDivElement>(null);
  const onReadyRef = useRef(props.onReady);
  const readyRef = useRef(false);
  useLayoutEffect(() => {
    const region = regionRef.current;
    if (region === null || readyRef.current) return;
    readyRef.current = true;
    onReadyRef.current(region);
  }, []);
  return createElement("div", {
    ref: regionRef,
    role: "status",
    "aria-live": "polite",
    "aria-atomic": "true",
    style: VISUALLY_HIDDEN,
  });
}
