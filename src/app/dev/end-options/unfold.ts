// How the ending opens, to match the transition that brought it (Intro.tsx). Each adds its moves to
// the ending's timeline: the two panes, the character arriving in its ring, and the answers.
//   singularity  out of the point it exploded from: the panes burst out bright and settle, the page
//                shakes, the answers are flung out to their places
//   shatter      out of the ring: the panes widen from its edge, the answers fly out of it
//   none         a plain rise, for no transition at all
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

  if (kind === "singularity") {
    // out of the point it exploded from, the middle of the screen: the panes burst out of it,
    // bright and blurred, and settle; the page shakes with the blast; the answers are flung out
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    [side, main].forEach((pane, i) => {
      const b = pane.getBoundingClientRect();
      line.fromTo(
        pane,
        {
          scale: 0.08,
          opacity: 0,
          filter: "blur(18px) brightness(2.6)",
          transformOrigin: `${cx - b.left}px ${cy - b.top}px`,
        },
        {
          scale: 1,
          opacity: 1,
          filter: "blur(0px) brightness(1)",
          duration: 1.0,
          ease: "expo.out",
          clearProps: "filter,transform,transformOrigin",
        },
        i * 0.05
      );
    });
    line
      .fromTo(
        el,
        { x: 0, y: 0 },
        {
          keyframes: { x: [9, -7, 5, -3, 1, 0], y: [-6, 5, -3, 2, -1, 0] },
          duration: 0.45,
          ease: "none",
          clearProps: "transform",
        },
        0
      )
      .fromTo(
        pop,
        { scale: 0, rotation: -40 },
        { scale: 1, rotation: 0, duration: 0.9, ease: "elastic.out(1, 0.45)" },
        0.18
      );
    answers.forEach((a, i) => {
      const b = a.getBoundingClientRect();
      line.fromTo(
        a,
        {
          x: cx - (b.left + b.width / 2),
          y: cy - (b.top + b.height / 2),
          scale: 0.3,
          opacity: 0,
          rotation: (Math.random() - 0.5) * 40,
        },
        {
          x: 0,
          y: 0,
          scale: 1,
          opacity: 1,
          rotation: 0,
          duration: 0.8,
          ease: "back.out(1.4)",
          clearProps: "transform",
        },
        0.12 + i * 0.04
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
