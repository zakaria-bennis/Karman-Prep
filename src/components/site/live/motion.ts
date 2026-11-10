// Whether the home page's painting and films are held still (the footer's button), remembered for the
// visitor. Changing it tells them through a "karman:motion" event. Browser only.

const KEY = "karman-motion";

export function motionPaused(): boolean {
  try {
    return localStorage.getItem(KEY) === "off";
  } catch {
    return false;
  }
}

export function setMotionPaused(paused: boolean) {
  try {
    localStorage.setItem(KEY, paused ? "off" : "on");
  } catch {
    /* lasts for this page only */
  }
  document.dispatchEvent(new CustomEvent("karman:motion", { detail: paused }));
}
