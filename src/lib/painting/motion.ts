/*
 * Whether the painting should hold still: the device asks for reduced motion, or the student
 * turned on "Reduce motion" in Settings, Sound and motion (stored on this device). That choice
 * also sets STILL_ATTR on the root element, which turns off the shell's springs and slides.
 */

/** localStorage key: "still" keeps the painting finished and still. */
export const MOTION_KEY = "karman-motion";
/** Fired on window when the student changes the choice, with `detail` "still" or "move". */
export const MOTION_EVENT = "karman-motion-change";

export function stillChosen(): boolean {
  try {
    return localStorage.getItem(MOTION_KEY) === "still";
  } catch {
    return false;
  }
}

/** Root attribute while "Reduce motion" is on (portal.css turns animations off under it). */
export const STILL_ATTR = "data-kp-still";

/** Saves the Reduce motion choice, marks the root, and tells the painting. */
export function setStillChosen(still: boolean): void {
  try {
    if (still) localStorage.setItem(MOTION_KEY, "still");
    else localStorage.removeItem(MOTION_KEY);
  } catch {
    /* Storage blocked: the choice lasts for this page only. */
  }
  document.documentElement.toggleAttribute(STILL_ATTR, still);
  window.dispatchEvent(new CustomEvent(MOTION_EVENT, { detail: still ? "still" : "move" }));
}

export function prefersStill(): boolean {
  if (stillChosen()) return true;
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** The same test as an inline boot script expression (no imports there). */
export const PREFERS_STILL_JS = `(function(){try{if(localStorage.getItem("${MOTION_KEY}")==="still")return true}catch(e){}return matchMedia("(prefers-reduced-motion: reduce)").matches})()`;
