// How the ending opens, to match the transition that brought it (Intro.tsx). Each adds its moves to
// the ending's timeline (ActivityEnd.tsx): the two panes, the character arriving in its ring, the
// answers ([data-answer]) and a time trial's bars ([data-bar]).
//   singularity  out of the point it exploded from: the character in its ring, which fills, then
//                flies home; the panes fold out from there
//   shatter      out of the ring: the panes widen from its edge, the answers fly out of it
//   none         a plain rise, for no transition at all
// However many answers there are (an endless run can pass 60), they all arrive within about a second.
import gsap from "gsap";
import type { IntroKind } from "./Intro";

/** When the rest of the ending comes in: the lines under the character, the next step, and the
 *  moment the character is home and may celebrate. */
export type Plan = { about: number; next: number; home: number };
const PLAIN: Plan = { about: 1.0, next: 3.0, home: 2.0 };

/** The gap between one answer's arrival and the next: `each`, or less when there are many. */
const gap = (each: number, count: number, within = 1) =>
  Math.min(each, within / Math.max(1, count));

/** A time trial's bars grow up from their foot, one after another. */
function grow(line: gsap.core.Timeline, el: HTMLElement, at: number) {
  const bars = el.querySelectorAll<HTMLElement>("[data-bar]");
  if (!bars.length) return;
  line.fromTo(
    bars,
    { scaleY: 0, transformOrigin: "50% 100%" },
    {
      scaleY: 1,
      duration: 0.45,
      stagger: gap(0.05, bars.length, 0.9),
      ease: "back.out(1.6)",
      clearProps: "transform",
    },
    at
  );
}

/** Laid out one above the other (a phone, or a tablet held either way): the Homework page's rule. */
export const stackedNow = () => !window.matchMedia("(min-width: 960px) and (hover: hover)").matches;

export function unfold(
  kind: IntroKind | "none",
  el: HTMLElement,
  line: gsap.core.Timeline,
  ring: DOMRect | undefined,
  /** Adds the ring's fill to the timeline, at `at` seconds, over `seconds`. */
  fill: (at: number, seconds: number) => void
): Plan {
  const rx = ring ? ring.left + ring.width / 2 : 0;
  const ry = ring ? ring.top + ring.height / 2 : 0;
  const [side, main] = Array.from(el.querySelectorAll<HTMLElement>("[data-pane]"));
  const pop = el.querySelector("[data-pop]");
  const answers = Array.from(el.querySelectorAll<HTMLElement>("[data-answer]"));
  const far = Math.max(window.innerWidth, window.innerHeight);

  if (kind === "shatter") {
    const edge = ring ? ring.width / 2 + 6 : 0;
    const at = (pane: HTMLElement) => {
      const b = pane.getBoundingClientRect();
      return `${rx - b.left}px ${ry - b.top}px`;
    };
    line
      .fromTo(
        side,
        { clipPath: `circle(${edge}px at ${at(side)})` },
        {
          clipPath: `circle(${far * 1.5}px at ${at(side)})`,
          duration: 1.2,
          ease: "power2.in",
          clearProps: "clipPath",
        },
        0
      )
      .fromTo(
        main,
        { clipPath: `circle(${edge}px at ${at(main)})` },
        {
          clipPath: `circle(${far * 1.6}px at ${at(main)})`,
          duration: 1.4,
          ease: "power2.in",
          clearProps: "clipPath",
        },
        0.2
      )
      .fromTo(
        pop,
        { scale: 0, rotation: -30 },
        { scale: 1, rotation: 0, duration: 0.8, ease: "elastic.out(1, 0.5)" },
        0.15
      );
    answers.forEach((a, i) => {
      const b = a.getBoundingClientRect();
      line.fromTo(
        a,
        {
          x: rx - (b.left + b.width / 2),
          y: ry - (b.top + b.height / 2),
          scale: 0.2,
          opacity: 0,
          rotation: -12,
        },
        { x: 0, y: 0, scale: 1, opacity: 1, rotation: 0, duration: 0.75, ease: "back.out(1.3)" },
        0.55 + i * gap(0.07, answers.length, 1.2)
      );
    });
    grow(line, el, 1.1);
    fill(0.5, 1.4);
    return PLAIN;
  }

  if (kind === "singularity") {
    // founder, 2026-11-19: quick and high energy, in this order
    //   the character pops out of the point, inside its ring, with the percent under it
    //   the ring fills, its color moving with it, the percent counting up
    //   ring, character and percent fly to their home in the left pane (the top, on a phone)
    //   that pane's glass comes up round them, and the answers' pane folds out of it: to the right
    //   from its edge on a computer, down from its foot on a phone, the answers folding down after
    //   then the character celebrates a good result (ActivityEnd)
    const hero = el.querySelector<HTMLElement>("[data-hero]");
    const svg = hero?.querySelector("svg");
    const percent = hero?.querySelector("[data-percent]");
    const stacked = stackedNow();
    if (hero) {
      const b = hero.getBoundingClientRect();
      gsap.set(hero, {
        x: window.innerWidth / 2 - (b.left + b.width / 2),
        y: window.innerHeight / 2 - (b.top + b.height / 2),
        scale: stacked ? 1.9 : 1.35,
      });
    }
    side.setAttribute("data-bare", "");
    gsap.set(main, { opacity: 0 });
    line
      .fromTo(
        el,
        { x: 0, y: 0 },
        {
          keyframes: { x: [8, -6, 4, -2, 0], y: [-5, 4, -2, 1, 0] },
          duration: 0.35,
          ease: "none",
          clearProps: "transform",
        },
        0
      )
      .fromTo(
        svg ?? [],
        { scale: 0, rotation: -120, transformOrigin: "50% 50%" },
        { scale: 1, rotation: 0, duration: 0.45, ease: "back.out(1.7)" },
        0
      )
      .fromTo(
        pop,
        { scale: 0, rotation: -220 },
        { scale: 1, rotation: 0, duration: 0.55, ease: "back.out(1.9)" },
        0.03
      )
      .fromTo(
        percent ?? [],
        { opacity: 0, scale: 0.5, y: -12 },
        { opacity: 1, scale: 1, y: 0, duration: 0.3, ease: "back.out(2)" },
        0.15
      );
    fill(0.2, 0.85);
    line
      // home
      .to(hero, { x: 0, y: 0, scale: 1, duration: 0.5, ease: "power3.inOut" }, 1.12)
      .call(() => side.removeAttribute("data-bare"), [], 1.45)
      .fromTo(
        side,
        { scale: 0.97 },
        { scale: 1, duration: 0.4, ease: "back.out(2)", clearProps: "transform" },
        1.45
      )
      // the answers' pane folds out of it
      .fromTo(
        main,
        stacked
          ? { rotationX: -100, transformOrigin: "50% 0%", transformPerspective: 1400, opacity: 0 }
          : { rotationY: -100, transformOrigin: "0% 50%", transformPerspective: 1600, opacity: 0 },
        {
          rotationX: 0,
          rotationY: 0,
          opacity: 1,
          duration: 0.55,
          ease: "back.out(1.15)",
          clearProps: "transform,transformOrigin",
        },
        1.58
      )
      .fromTo(
        answers,
        { rotationX: -90, transformOrigin: "50% 0%", transformPerspective: 700, opacity: 0 },
        {
          rotationX: 0,
          opacity: 1,
          duration: 0.4,
          stagger: gap(0.04, answers.length, 0.8),
          ease: "back.out(1.5)",
          clearProps: "transform,transformOrigin",
        },
        1.8
      );
    grow(line, el, 1.95);
    return { about: 1.5, next: 2.3, home: 1.65 };
  }

  // no transition: a plain rise
  line
    .fromTo(
      [side, main],
      { y: 24, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: "expo.out" },
      0
    )
    .fromTo(
      answers,
      { x: 24, opacity: 0 },
      {
        x: 0,
        opacity: 1,
        duration: 0.4,
        stagger: gap(0.07, answers.length, 1),
        ease: "back.out(1.6)",
      },
      0.4
    );
  grow(line, el, 0.7);
  fill(0.5, 1.4);
  return PLAIN;
}
