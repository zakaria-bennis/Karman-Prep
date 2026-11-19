"use client";
// Where an activity begins and ends (founder, 2026-11-18): the portal's live landscape with one
// piece of frosted glass on it, the same world the questions sit on. It replaces the old painted
// portal shell (FlowFrame) one activity at a time; the skill set is the first.
import Link from "next/link";
import type { ReactNode } from "react";
import { portalFontVars } from "@/components/portal/fonts";
import { QuizWorld } from "@/components/learn/quiz-shell/QuizWorld";
import s from "./stage.module.css";

export function FlowStage({
  back,
  children,
}: {
  /** The way out, at the top left. */
  back: { href: string; label: string };
  children: ReactNode;
}) {
  return (
    <div className={`${portalFontVars} ${s.stage}`} data-flow-stage>
      <QuizWorld />
      <Link className={s.back} href={back.href}>
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path d="M14.500 6.500L9 12l5.500 5.500" />
        </svg>
        {back.label}
      </Link>
      <main className={s.main}>{children}</main>
    </div>
  );
}

/** The one button to press. While `busy` it shows three orbs circling and cannot be pressed. */
export function Go({
  children,
  href,
  onClick,
  busy = false,
  hint,
}: {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  busy?: boolean;
  /** The key that presses it, shown at its right where there is a keyboard ("Enter"). */
  hint?: string;
}) {
  const inside = (
    <>
      <span>{children}</span>
      {busy ? (
        <i className={s.orbs} aria-hidden="true">
          <b />
          <b />
          <b />
        </i>
      ) : (
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path d="M5 12h13M12.500 6.500L18 12l-5.500 5.500" />
        </svg>
      )}
      {hint && <kbd aria-hidden="true">{hint}</kbd>}
    </>
  );
  return href ? (
    <Link className={s.go} href={href} data-rise>
      {inside}
    </Link>
  ) : (
    <button
      type="button"
      className={s.go}
      onClick={onClick}
      disabled={busy}
      aria-busy={busy}
      data-rise
    >
      {inside}
    </button>
  );
}
