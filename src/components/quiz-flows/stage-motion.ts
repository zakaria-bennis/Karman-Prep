// How the start and end screens move (GSAP). Everything here is skipped when the student, or the
// device, asked for less motion: the screen is then simply there, finished.
import gsap from "gsap";
import { prefersStill } from "@/lib/painting/motion";

/** The pieces of a screen rise into place one after another, quickly. */
export function arrive(root: HTMLElement | null) {
  if (!root || prefersStill()) return;
  const pieces = root.querySelectorAll("[data-rise]");
  const tween = gsap.fromTo(
    pieces,
    { y: 14, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.42, ease: "power3.out", stagger: 0.05, clearProps: "all" }
  );
  return () => void tween.kill();
}

/** A number counts up to where it stands. */
export function count(el: HTMLElement | null, to: number, after = 0.2, sign = "") {
  if (!el) return;
  if (prefersStill() || to === 0) {
    el.textContent = `${sign}${to}`;
    return;
  }
  const at = { n: 0 };
  const tween = gsap.to(at, {
    n: to,
    duration: 0.9,
    delay: after,
    ease: "power2.out",
    onUpdate: () => {
      el.textContent = `${sign}${Math.round(at.n)}`;
    },
  });
  return () => void tween.kill();
}

const PARTY = ["#23a26d", "#ffc81a", "#4f8dff", "#ff6b8a", "#fffdf8"];

/** Confetti from the middle of `host`, for a level gained. It cleans up after itself. */
export function confetti(host: HTMLElement | null, after = 1.1, pieces = 56) {
  if (!host || prefersStill()) return;
  const made: HTMLElement[] = [];
  const box = host.getBoundingClientRect();
  const timer = window.setTimeout(() => {
    for (let i = 0; i < pieces; i++) {
      const bit = document.createElement("i");
      const wide = 6 + Math.random() * 6;
      bit.setAttribute("aria-hidden", "true");
      bit.style.cssText = `position:absolute;left:50%;top:42%;width:${wide}px;height:${
        wide * (Math.random() < 0.5 ? 1 : 0.45)
      }px;border-radius:${Math.random() < 0.3 ? "50%" : "2px"};background:${
        PARTY[i % PARTY.length]
      };pointer-events:none;z-index:3`;
      host.appendChild(bit);
      made.push(bit);
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 2.6;
      const far = 90 + Math.random() * Math.max(140, box.width * 0.5);
      gsap
        .timeline({ onComplete: () => bit.remove() })
        .fromTo(
          bit,
          { x: 0, y: 0, scale: 0.4, rotation: 0 },
          {
            x: Math.cos(angle) * far,
            y: Math.sin(angle) * far * 0.9,
            scale: 1,
            rotation: (Math.random() - 0.5) * 540,
            duration: 0.55 + Math.random() * 0.25,
            ease: "power3.out",
          }
        )
        .to(bit, {
          y: `+=${box.height * 0.6 + Math.random() * 140}`,
          x: `+=${(Math.random() - 0.5) * 90}`,
          rotation: `+=${(Math.random() - 0.5) * 720}`,
          opacity: 0,
          duration: 1.3 + Math.random() * 0.7,
          ease: "power1.in",
        });
    }
  }, after * 1000);
  return () => {
    window.clearTimeout(timer);
    made.forEach((bit) => bit.remove());
  };
}

/** From the last question into the ending: the glass the question sat on is still there for a beat,
 *  saying the set is over; then it draws back and the ending comes forward out of it. */
export function curtain(veil: HTMLElement | null, pieces: HTMLElement | null) {
  if (!veil) return;
  if (prefersStill()) {
    veil.style.display = "none";
    return;
  }
  const word = veil.firstElementChild;
  const line = gsap.timeline();
  line
    .fromTo(
      word,
      { scale: 0.6, opacity: 0, y: 10 },
      { scale: 1, opacity: 1, y: 0, duration: 0.5, ease: "back.out(2)" }
    )
    .to(veil, { scale: 0.9, opacity: 0, duration: 0.42, ease: "power2.in" }, 0.95)
    .set(veil, { display: "none" });
  // nothing of the ending shows through the glass while it still says the set is over
  if (pieces) line.set(pieces.querySelectorAll("[data-rise]"), { opacity: 0 }, 0);
  if (pieces)
    line.fromTo(
      pieces.querySelectorAll("[data-rise]"),
      { y: 28, opacity: 0, scale: 0.96 },
      {
        y: 0,
        opacity: 1,
        scale: 1,
        duration: 0.6,
        ease: "back.out(1.4)",
        stagger: 0.07,
        clearProps: "transform,opacity",
      },
      1.15
    );
  return () => void line.kill();
}

/** A small swell, for the thing that just changed (a coin landing, a level gained). */
export function swell(el: Element | null, by = 1.18) {
  if (!el || prefersStill()) return;
  gsap.fromTo(el, { scale: by }, { scale: 1, duration: 0.45, ease: "elastic.out(1, 0.5)" });
}
