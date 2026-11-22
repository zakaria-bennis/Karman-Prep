"use client";
// The frame for a screen around an activity that is not a question (founder, 2026-11-22: "the old
// look needs to just go"): the quiz's live landscape (QuizWorld), the way back at the top left, the
// screen's name on a small piece of glass, and the content on frosted glass. It replaces the
// painted portal shell on every such screen; FlowFrame is this frame with the Library as the way
// back, and a server page can use it directly.
//
// Every child of a column is one piece of glass. A child that holds old portal Cards stays bare and
// each Card is a piece instead. The old parts (Card, Row, Cta, SectionHeader, Num, Ring,
// SkillSquares) are restyled inside the frame by frame.module.css until they are rebuilt.
// Light or dark follows the saved choice, as the quiz does; Reduce motion holds it still.
import Link from "next/link";
import { useEffect, type ReactNode } from "react";
import { QuizWorld } from "@/components/learn/quiz-shell/QuizWorld";
import { portalFontVars } from "@/components/portal/fonts";
import { STILL_ATTR, stillChosen } from "@/lib/painting/motion";
import f from "./frame.module.css";

export function StageFrame({
  back,
  title,
  children,
  side,
}: {
  /** The way out, at the top left, named for where it goes ("Library"). */
  back: { href: string; label: string };
  /** The screen's name, on a small piece of glass. */
  title?: string;
  children: ReactNode;
  /** A second column: beside the first on a wide screen, under it on a phone or a tablet. */
  side?: ReactNode;
}) {
  // Settings, Reduce motion marks the root as the portal does, so the frame's own movement and
  // the old parts' count-ups hold still on a page opened straight from a link
  useEffect(() => {
    if (stillChosen()) document.documentElement.setAttribute(STILL_ATTR, "");
  }, []);
  const name = title?.trim();
  return (
    // data-flow-stage: the Learn pages' old top bar steps away (LearnLayout.tsx)
    <div className={`${portalFontVars} ${f.frame}`} data-flow-stage>
      <QuizWorld />
      <Link className={f.back} href={back.href}>
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path d="M14.5 6.5L9 12l5.5 5.5" />
        </svg>
        {back.label}
      </Link>
      <div className={f.body} data-side={side ? "" : undefined}>
        {name && <h1 className={f.title}>{name}</h1>}
        <div className={f.column}>{children}</div>
        {side && <div className={f.column}>{side}</div>}
      </div>
    </div>
  );
}
