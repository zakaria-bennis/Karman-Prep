"use client";
// Keeping questions from being lifted off the screen (founder, 2026-11-17). Nothing here is seen
// by a student who is simply answering:
//   masked     the question blurs at once when the page is left, when the pointer leaves the
//              window (except up into the browser's own tabs and address bar), or when the keys that begin a screenshot go down, and comes straight back
//              when the student returns (a click or a move back in the page)
//   blocked    the right-click menu, and the keys that open a browser's developer tools or a
//              page's source
// It cannot stop a photograph of the screen; it makes copying harder and leaves a trace. What it
// sees is counted on the question's record (use-answer-record.ts) for a tutor to weigh.
import { useEffect, useState } from "react";

export type GuardEvent = "screenshot-keys" | "devtools-keys";

/** The keys that open developer tools or a page's source, on a Mac and elsewhere. */
function opensTools(e: KeyboardEvent): boolean {
  const key = e.key.toLowerCase();
  if (e.key === "F12") return true;
  const tools = ["i", "j", "c"].includes(key);
  if (tools && e.metaKey && e.altKey) return true;
  if (tools && e.ctrlKey && e.shiftKey) return true;
  return key === "u" && (e.ctrlKey || (e.metaKey && e.altKey));
}

export function useGuard({
  enabled,
  onEvent,
}: {
  enabled: boolean;
  onEvent?(event: GuardEvent): void;
}): boolean {
  const [masked, setMasked] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    let held = false; // masked by screenshot keys: stays until the pointer is back in the page
    const hide = () => setMasked(true);
    const show = () => {
      held = false;
      setMasked(false);
    };
    const seen = () => (document.hidden ? hide() : !held && show());
    const left = (e: MouseEvent) => {
      // the pointer went out through an edge of the window; out through the top, with the page
      // still in front, it is resting on the browser's own tabs or address bar, and that alone
      // does not blur the question (founder, 2026-11-23)
      if (e.relatedTarget) return;
      if (e.clientY <= 0 && document.hasFocus()) return;
      hide();
    };
    const back = () => !held && document.hasFocus() && show();
    // the pointer moving in the page, with the page in front, means the student is back (a
    // screenshot tool takes the pointer away from the page while it is choosing its picture)
    const returned = () => document.hasFocus() && show();
    const keys = (e: KeyboardEvent) => {
      if (opensTools(e)) {
        e.preventDefault();
        e.stopPropagation();
        onEvent?.("devtools-keys");
        return;
      }
      // a Mac's screenshot begins with Command and Shift together; Windows has its own key
      const shot = (e.metaKey && e.shiftKey && !e.altKey && !e.ctrlKey) || e.key === "PrintScreen";
      if (shot && ["Meta", "Shift", "3", "4", "5", "PrintScreen", "s", "S"].includes(e.key)) {
        if (!held) onEvent?.("screenshot-keys");
        held = true;
        hide();
      }
    };
    const menu = (e: MouseEvent) => e.preventDefault();
    window.addEventListener("blur", hide);
    window.addEventListener("focus", back);
    window.addEventListener("beforeprint", hide);
    window.addEventListener("afterprint", show);
    document.addEventListener("visibilitychange", seen);
    document.documentElement.addEventListener("mouseleave", left);
    document.documentElement.addEventListener("mouseenter", back);
    window.addEventListener("pointermove", returned, { passive: true });
    window.addEventListener("pointerdown", show, { passive: true });
    window.addEventListener("keydown", keys, true);
    window.addEventListener("keyup", keys, true);
    document.addEventListener("contextmenu", menu);
    return () => {
      window.removeEventListener("blur", hide);
      window.removeEventListener("focus", back);
      window.removeEventListener("beforeprint", hide);
      window.removeEventListener("afterprint", show);
      document.removeEventListener("visibilitychange", seen);
      document.documentElement.removeEventListener("mouseleave", left);
      document.documentElement.removeEventListener("mouseenter", back);
      window.removeEventListener("pointermove", returned);
      window.removeEventListener("pointerdown", show);
      window.removeEventListener("keydown", keys, true);
      window.removeEventListener("keyup", keys, true);
      document.removeEventListener("contextmenu", menu);
    };
  }, [enabled, onEvent]);
  return masked;
}

/** A mark no eye can see, laid over the whole screen: the run it belongs to and the time, at
 *  about one part in seventy, over and over. A copy of the screen carries it, so a leaked
 *  picture can be traced to the sitting it came from. (No name or address is in it: the run
 *  already says whose it is, and only Karman can look that up.) */
export function traceMark(runId: string, at: Date): string {
  const text = `${runId.slice(0, 13)} ${at.toISOString().slice(0, 16)}`;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="130">` +
    `<text x="10" y="50" font-family="monospace" font-size="13" fill="#808080" ` +
    `transform="rotate(-18 150 65)">${text}</text>` +
    `<text x="80" y="110" font-family="monospace" font-size="13" fill="#808080" ` +
    `transform="rotate(-18 150 65)">${text}</text></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
