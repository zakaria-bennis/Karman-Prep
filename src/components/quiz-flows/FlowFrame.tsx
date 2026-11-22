"use client";
// Every quiz-flow screen that is not the question screen itself (loading, a break, a plan limit, a
// result) stands on the quiz's live landscape, with the Library as the way back (StageFrame.tsx).
import Link from "next/link";
import type { ReactNode } from "react";
import { Go } from "./FlowStage";
import { StageFrame } from "./StageFrame";
import type { ShellUser } from "./types";
import f from "./frame.module.css";

/** The way back from every quiz-flow screen: the portal's Library, which every plan has. */
const LIBRARY = { href: "/dashboard/student?page=library", label: "Library" };

export function FlowFrame({
  title,
  children,
  side,
}: {
  /** The student. The old painted shell showed their name, streak and menu; this frame needs none. */
  user: ShellUser;
  title?: string;
  children: ReactNode;
  side?: ReactNode;
}) {
  return (
    <StageFrame back={LIBRARY} title={title} side={side}>
      {children}
    </StageFrame>
  );
}

type Action = { href: string; label: string } | { onClick: () => void; label: string };

/** A short state screen on one piece of glass: loading, an error, a break between sections, a
 *  plan limit. The action is the stage's one button; the way back sits beside it. */
export function Message({
  title,
  text,
  action,
  back,
  busy = false,
}: {
  title: string;
  text: string;
  action?: Action;
  back?: { href: string; label: string };
  busy?: boolean;
}) {
  return (
    <section className={f.message} aria-busy={busy} aria-live="polite">
      <h2>
        {busy && !action && (
          <i className={f.orbs} aria-hidden="true">
            <b />
            <b />
            <b />
          </i>
        )}
        {title}
      </h2>
      <p>{text}</p>
      {(action || back) && (
        <div className={f.acts}>
          {action &&
            ("href" in action ? (
              <Go href={action.href}>{action.label}</Go>
            ) : (
              <Go onClick={action.onClick} busy={busy}>
                {action.label}
              </Go>
            ))}
          {back && (
            <Link className={f.quiet} href={back.href}>
              {back.label}
            </Link>
          )}
        </div>
      )}
    </section>
  );
}
