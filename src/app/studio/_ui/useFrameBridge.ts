"use client";

// The studio's hold on the page inside its frame (same site, so the frame's document is reachable).
// It follows the frame's address as you click around, and in Comment and Edit words modes it stops
// the page's own clicks and keys, highlights what is under the pointer, and reports what you picked
// or retyped. Saved copy edits are shown on the page again each time it loads. Nothing here writes
// to the server; Studio.tsx saves.
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import {
  cssPath,
  describe,
  findElement,
  previewText,
  restoreText,
  snapshotChildren,
  snippet,
  squash,
  textTarget,
} from "@/lib/page-studio/dom";
import type { StudioNote } from "@/lib/page-studio/types";
import type { Box, Mode } from "./devices";

export interface Pick {
  selector: string;
  label: string;
  text: string;
  html: string;
}

export interface Edit extends Pick {
  oldText: string;
  newText: string;
}

export interface Pin {
  id: string;
  n: number;
  box: Box;
  kind: StudioNote["kind"];
}

interface Options {
  frame: RefObject<HTMLIFrameElement>;
  mode: Mode;
  scale: number;
  /** Notes on the page now showing (copy edits to show again, comments to pin). */
  notes: StudioNote[];
  showEdits: boolean;
  onUrl: (url: string | null) => void;
  onPick: (pick: Pick) => void;
  onEdit: (edit: Edit) => void;
  onMiss: (message: string) => void;
}

const FRAME_CSS = `
[data-impersonation-banner], nextjs-portal { display: none !important; }
html[data-studio-mode="comment"] *, html[data-studio-mode="comment"] *::before { cursor: crosshair !important; }
html[data-studio-mode="edit"] * { cursor: text !important; }
[data-studio-edited] { outline: 2px dashed #f5a524 !important; outline-offset: 2px; }
[data-studio-editing] { outline: 2px solid #3b82f6 !important; outline-offset: 2px; background: rgba(59,130,246,.08) !important; }
`;

const OPEN = new Set(["draft", "sent", "question", "working", "in_pr"]);

/** Events the page must not see while you comment or edit. */
const STOPPED = [
  "pointerdown",
  "pointerup",
  "mousedown",
  "mouseup",
  "click",
  "dblclick",
  "contextmenu",
  "touchstart",
  "submit",
] as const;

function boxOf(el: Element, scale: number): Box | null {
  const r = el.getBoundingClientRect();
  if (!r.width && !r.height) return null;
  return { x: r.left * scale, y: r.top * scale, w: r.width * scale, h: r.height * scale };
}

function pickOf(el: Element): Pick {
  return {
    selector: cssPath(el),
    label: describe(el),
    text: squash(el.textContent).slice(0, 4000),
    html: snippet(el),
  };
}

export function useFrameBridge(o: Options) {
  const live = useRef(o);
  useEffect(() => {
    live.current = o;
  });
  const doc = useRef<Document | null>(null);
  const href = useRef<string | null>(null);
  const hoverEl = useRef<Element | null>(null);
  const selectedSel = useRef<string | null>(null);
  const editing = useRef<{ el: Element; undo: () => void; before: string } | null>(null);
  const [hover, setHover] = useState<Box | null>(null);
  const [selected, setSelected] = useState<Box | null>(null);
  const [pins, setPins] = useState<Pin[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  /** Finish typing in an element: put React's nodes back, show the new words, report the change. */
  const finishEdit = useCallback((keep: boolean) => {
    const e = editing.current;
    if (!e) return;
    editing.current = null;
    setIsEditing(false);
    const after = squash(e.el.textContent);
    e.undo();
    e.el.removeAttribute("contenteditable");
    e.el.removeAttribute("data-studio-editing");
    if (!keep || after === e.before) return;
    const pick = pickOf(e.el);
    previewText(e.el, after);
    e.el.setAttribute("data-studio-edited", "new");
    live.current.onEdit({ ...pick, text: e.before, oldText: e.before, newText: after });
  }, []);

  const startEdit = useCallback(
    (el: Element) => {
      finishEdit(true);
      const before = squash(el.textContent);
      // Words already edited here: type over the original, so the note keeps the real "before".
      if (el.hasAttribute("data-studio-edited")) {
        restoreText(el);
        el.removeAttribute("data-studio-edited");
      }
      const original = squash(el.textContent);
      editing.current = { el, undo: snapshotChildren(el), before: original || before };
      el.setAttribute("contenteditable", "true");
      el.setAttribute("data-studio-editing", "");
      setIsEditing(true);
      (el as HTMLElement).focus?.();
      const sel = el.ownerDocument.defaultView?.getSelection();
      if (sel) {
        const range = el.ownerDocument.createRange();
        range.selectNodeContents(el);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    },
    [finishEdit]
  );

  /** Show saved copy edits on the page, and pin comments to their elements. */
  const refresh = useCallback(() => {
    const d = doc.current;
    if (!d) return;
    const { notes, scale, showEdits } = live.current;
    const pagePins: Pin[] = [];
    notes.forEach((n, i) => {
      if (!OPEN.has(n.status)) return;
      const el = findElement(d, n.selector);
      if (!el) return;
      if (n.kind === "copy") {
        if (editing.current?.el === el) return;
        const now = squash(el.textContent);
        if (
          showEdits &&
          n.newText !== null &&
          now === squash(n.oldText) &&
          now !== squash(n.newText)
        ) {
          previewText(el, n.newText);
          el.setAttribute("data-studio-edited", n.id);
        }
      }
      const box = boxOf(el, scale);
      if (box) pagePins.push({ id: n.id, n: i + 1, box, kind: n.kind });
    });
    if (!showEdits) {
      d.querySelectorAll("[data-studio-edited]").forEach((el) => {
        restoreText(el);
        el.removeAttribute("data-studio-edited");
      });
    }
    setPins(pagePins);
    if (hoverEl.current)
      setHover(hoverEl.current.isConnected ? boxOf(hoverEl.current, scale) : null);
    const sel = selectedSel.current ? findElement(d, selectedSel.current) : null;
    setSelected(sel ? boxOf(sel, scale) : null);
  }, []);

  const attach = useCallback(
    (d: Document) => {
      doc.current = d;
      const w = d.defaultView;
      if (!w) return;
      if (!d.getElementById("page-studio-style")) {
        const style = d.createElement("style");
        style.id = "page-studio-style";
        style.textContent = FRAME_CSS;
        (d.head ?? d.documentElement).appendChild(style);
      }
      d.documentElement.setAttribute("data-studio-mode", live.current.mode);

      const stop = (e: Event) => {
        const mode = live.current.mode;
        if (mode === "browse") return;
        const target = e.target as Element | null;
        e.stopPropagation();
        if (editing.current && target && editing.current.el.contains(target)) {
          // Typing inside: the caret may move, but a link or button around the words must not fire.
          if (e.type === "click" || e.type === "submit") e.preventDefault();
          return;
        }
        // A touch must still turn into a click, so its start is only hidden from the page.
        if (e.type !== "touchstart") e.preventDefault();
        if (e.type !== "click" || !target || target.nodeType !== 1) return;
        if (mode === "comment") {
          selectedSel.current = cssPath(target);
          setSelected(boxOf(target, live.current.scale));
          live.current.onPick(pickOf(target));
          return;
        }
        const words = textTarget(target);
        if (!words) {
          finishEdit(true);
          live.current.onMiss("No words there. Switch to Comment to leave a note on it.");
          return;
        }
        startEdit(words);
      };
      for (const type of STOPPED) w.addEventListener(type, stop, { capture: true, passive: false });

      w.addEventListener(
        "mouseover",
        (e) => {
          const mode = live.current.mode;
          if (mode === "browse") return;
          const t = e.target as Element | null;
          if (!t || t.nodeType !== 1) return;
          const el = mode === "edit" ? textTarget(t) : t;
          hoverEl.current = el;
          setHover(el ? boxOf(el, live.current.scale) : null);
        },
        { capture: true }
      );
      w.addEventListener("mouseleave", () => {
        hoverEl.current = null;
        setHover(null);
      });

      // While typing, the page's own keyboard shortcuts stay quiet. Enter keeps, Escape undoes.
      const keys = (e: KeyboardEvent) => {
        if (!editing.current) return;
        e.stopPropagation();
        if (e.type !== "keydown") return;
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          finishEdit(true);
        } else if (e.key === "Escape") {
          e.preventDefault();
          finishEdit(false);
        }
      };
      for (const type of ["keydown", "keyup", "keypress", "beforeinput", "input"] as const)
        w.addEventListener(type, keys as EventListener, { capture: true });
      w.addEventListener("focusout", (e) => {
        if (editing.current && e.target === editing.current.el) finishEdit(true);
      });
      w.addEventListener("scroll", refresh, { capture: true, passive: true });
      w.addEventListener("resize", refresh);
      refresh();
    },
    [finishEdit, refresh, startEdit]
  );

  // Follow the frame: a new document after each full load, a new address after each click.
  useEffect(() => {
    const tick = window.setInterval(() => {
      const f = o.frame.current;
      if (!f) return;
      let url: string | null = null;
      let d: Document | null = null;
      try {
        const loc = f.contentWindow?.location;
        if (!loc || loc.href === "about:blank") return; // a fresh frame, still loading
        url = `${loc.pathname}${loc.search}`;
        d = f.contentDocument;
      } catch {
        url = null; // left the site (sign-in, payment): another site's page can't be read
      }
      if (url !== href.current) {
        href.current = url;
        selectedSel.current = null;
        setSelected(null);
        live.current.onUrl(url);
      }
      if (d && d !== doc.current && d.readyState !== "loading" && url) {
        editing.current = null;
        setIsEditing(false);
        attach(d);
      }
    }, 250);
    const slow = window.setInterval(refresh, 1000);
    return () => {
      window.clearInterval(tick);
      window.clearInterval(slow);
    };
  }, [o.frame, attach, refresh]);

  // Mode changes: tell the page (for the cursor), and finish any typing.
  useEffect(() => {
    doc.current?.documentElement.setAttribute("data-studio-mode", o.mode);
    if (o.mode !== "edit") finishEdit(true);
    hoverEl.current = null;
    setHover(null);
    if (o.mode !== "comment") {
      selectedSel.current = null;
      setSelected(null);
    }
  }, [o.mode, finishEdit]);

  useEffect(refresh, [o.notes, o.scale, o.showEdits, refresh]);

  const clearSelection = useCallback(() => {
    selectedSel.current = null;
    setSelected(null);
  }, []);

  /** Point at a saved note's element (from the notes list). */
  const focusSelector = useCallback(
    (selector: string) => {
      const d = doc.current;
      const el = d ? findElement(d, selector) : null;
      if (!el) return false;
      el.scrollIntoView({ block: "center", behavior: "smooth" });
      selectedSel.current = selector;
      window.setTimeout(refresh, 400);
      return true;
    },
    [refresh]
  );

  return { hover, selected, pins, isEditing, finishEdit, clearSelection, focusSelector };
}
