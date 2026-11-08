/*
 * Whether the painting should hold still: the device asks for reduced motion, or the student
 * turned on "Keep the painting still" in Sound and motion (stored on this device).
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

export function prefersStill(): boolean {
  if (stillChosen()) return true;
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** The same test as an inline boot script expression (no imports there). */
export const PREFERS_STILL_JS = `(function(){try{if(localStorage.getItem("${MOTION_KEY}")==="still")return true}catch(e){}return matchMedia("(prefers-reduced-motion: reduce)").matches})()`;
