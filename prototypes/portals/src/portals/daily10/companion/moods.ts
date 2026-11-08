/**
 * The companion's expressions, ported from prototypes/daily10-end/daily10/mascot.js
 * (setMood and Mascot.moodOn): n neutral, h happy (eyes closed), k kind, c curious,
 * o delighted, z dozing, s sad, w worried. The design system's heads carry the
 * neutral and happy eye groups; sad and dozing eyes fall back to the open eyes.
 */
export type PetMood = "n" | "h" | "k" | "c" | "o" | "z" | "s" | "w";

const Y = -32;
export const MOUTH: Record<PetMood, string> = {
  n: `M-4 ${Y + 25} Q0 ${Y + 28} 4 ${Y + 25}`,
  w: `M-3 ${Y + 26} Q0 ${Y + 27} 3 ${Y + 26}`,
  h: `M-6 ${Y + 24} Q0 ${Y + 34} 6 ${Y + 24}Z`,
  s: `M-4 ${Y + 28} Q0 ${Y + 25} 4 ${Y + 28}`,
  z: `M-3 ${Y + 26} Q0 ${Y + 27} 3 ${Y + 26}`,
  c: `M-5 ${Y + 26} Q-2.5 ${Y + 24} 0 ${Y + 26} Q2.5 ${Y + 28} 5 ${Y + 26}`,
  k: `M-5 ${Y + 24.5} Q0 ${Y + 29.5} 5 ${Y + 24.5}`,
  o: `M-4 ${Y + 24} Q0 ${Y + 33} 4 ${Y + 24} Q0 ${Y + 21} -4 ${Y + 24}Z`,
};

/** Apply a mood to a drawn head (every .m-* group under root). */
export function applyMood(root: ParentNode, m: PetMood, restBlush = 0.5) {
  const q = (sel: string) => Array.from(root.querySelectorAll<SVGElement>(sel));
  const show = (sel: string, on: boolean) =>
    q(sel).forEach((e) => (e.style.opacity = on ? "1" : "0"));
  const hasS = q(".m-eS").length > 0;
  const hasZ = q(".m-eZ").length > 0;
  show(
    ".m-eN",
    m === "n" || m === "w" || m === "c" || m === "o" || (m === "s" && !hasS) || (m === "z" && !hasZ)
  );
  show(".m-eH", m === "h" || m === "k");
  show(".m-eS", m === "s");
  show(".m-eZ", m === "z");
  q(".m-mouth").forEach((e) => {
    e.setAttribute("d", MOUTH[m]);
    e.setAttribute("fill", m === "h" || m === "o" ? "#7A2E24" : "none");
  });
  q(".m-blush").forEach(
    (e) => (e.style.opacity = String(m === "h" ? 0.85 : m === "k" ? 0.75 : restBlush))
  );
}

/** A blink: the lids close for 150 ms; a quarter of the time they close twice. */
export function blink(root: ParentNode, dbl?: boolean) {
  const lids = Array.from(root.querySelectorAll<SVGElement>(".m-lid"));
  if (!lids.length) return;
  lids.forEach((l) => {
    l.style.transformBox = "fill-box";
    l.style.transformOrigin = "center";
  });
  const go = (delay: number) =>
    lids.forEach((l) =>
      l.animate(
        [{ transform: "scaleY(1)" }, { transform: "scaleY(.08)" }, { transform: "scaleY(1)" }],
        { duration: 150, delay, easing: "ease-in-out" }
      )
    );
  go(0);
  if (dbl === true || (dbl === undefined && Math.random() < 0.25)) go(210);
}

/** Whether this screen is driven by touch: a coarse pointer, or a phone or iPad frame in the gallery. */
export function touchHint(): boolean {
  const coarse = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
  const gallery = location.hash.startsWith("#/") && !/device=desktop/.test(location.hash);
  return coarse || gallery;
}
