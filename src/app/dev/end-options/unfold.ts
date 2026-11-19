// How the ending opens, to match the transition that brought it (Intro.tsx). Each adds its moves to
// the ending's timeline: the two panes, the character arriving in its ring, and the answers.
//   shatter    out of the ring: the panes widen from its edge, the answers fly out of it
//   plane      like paper unfolding: the panes swing down and open from their hinges, the answers
//              unfold one under another, the character drops into the ring
//   fireflies  softly into focus: the panes and the answers clear from a blur, the character glows in
//   flip       the left pane is already there (the card landed on it): the answers fan out of it like
//              a hand of cards
//   none       a plain rise, for no transition at all
import gsap from "gsap";
import type { IntroKind } from "./Intro";

export function unfold(
  kind: IntroKind | "none",
  el: HTMLElement,
  line: gsap.core.Timeline,
  ring: DOMRect | undefined
) {
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
        0.55 + i * 0.07
      );
    });
    return;
  }

  if (kind === "plane") {
    line
      .fromTo(
        side,
        { rotationX: -100, transformOrigin: "50% 0%", transformPerspective: 1100, opacity: 0.3 },
        {
          rotationX: 0,
          opacity: 1,
          duration: 0.9,
          ease: "back.out(1.1)",
          clearProps: "transform,opacity",
        },
        0
      )
      .fromTo(
        main,
        { rotationY: 100, transformOrigin: "0% 50%", transformPerspective: 1400, opacity: 0.3 },
        {
          rotationY: 0,
          opacity: 1,
          duration: 1.0,
          ease: "back.out(1.05)",
          clearProps: "transform,opacity",
        },
        0.25
      )
      .fromTo(
        pop,
        { y: -160, scale: 0.7, opacity: 0 },
        { y: 0, scale: 1, opacity: 1, duration: 0.9, ease: "bounce.out" },
        0.1
      )
      .fromTo(
        answers,
        { rotationX: -95, transformOrigin: "50% 0%", transformPerspective: 700, opacity: 0 },
        {
          rotationX: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.07,
          ease: "back.out(1.4)",
          clearProps: "transform,opacity",
        },
        0.75
      );
    return;
  }

  if (kind === "fireflies") {
    line
      .fromTo(
        [side, main],
        { opacity: 0, filter: "blur(18px)", scale: 1.03 },
        {
          opacity: 1,
          filter: "blur(0px)",
          scale: 1,
          duration: 0.8,
          stagger: 0.15,
          ease: "power2.out",
          clearProps: "filter,transform",
        },
        0
      )
      .fromTo(
        pop,
        { opacity: 0, filter: "blur(10px) brightness(2)", scale: 0.8 },
        {
          opacity: 1,
          filter: "blur(0px) brightness(1)",
          scale: 1,
          duration: 1.0,
          ease: "power2.out",
          clearProps: "filter",
        },
        0.1
      )
      .fromTo(
        answers,
        { opacity: 0, y: 10, filter: "blur(8px)" },
        {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          duration: 0.7,
          stagger: 0.08,
          ease: "power2.out",
          clearProps: "filter",
        },
        0.5
      );
    return;
  }

  if (kind === "flip") {
    const box = side.getBoundingClientRect();
    const sx = box.left + box.width / 2;
    const sy = box.top + box.height / 2;
    line
      .fromTo(
        main,
        { opacity: 0, x: -30 },
        { opacity: 1, x: 0, duration: 0.6, ease: "power3.out", clearProps: "transform" },
        0.1
      )
      .fromTo(
        pop,
        { scale: 0, rotation: -30 },
        { scale: 1, rotation: 0, duration: 0.8, ease: "elastic.out(1, 0.5)" },
        0
      );
    // a hand of cards: stacked on the left pane, fanned, then dealt to their places
    answers.forEach((a, i) => {
      const b = a.getBoundingClientRect();
      line.fromTo(
        a,
        {
          x: sx - (b.left + b.width / 2),
          y: sy - (b.top + b.height / 2) + 40,
          rotation: (i - (answers.length - 1) / 2) * 9,
          scale: 0.55,
          opacity: 0,
          transformOrigin: "50% 120%",
        },
        {
          x: 0,
          y: 0,
          rotation: 0,
          scale: 1,
          opacity: 1,
          duration: 0.7,
          ease: "back.out(1.2)",
          clearProps: "transform",
        },
        0.35 + i * 0.08
      );
    });
    return;
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
      { x: 0, opacity: 1, duration: 0.4, stagger: 0.07, ease: "back.out(1.6)" },
      0.4
    );
}
