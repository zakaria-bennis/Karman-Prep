import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Panel } from "@/design-system/glass/Panel";
import { GlassButton } from "@/design-system/glass/GlassButton";
import { cn } from "@/design-system/cn";

/*
 * DraftCard: the parent update as the tutor reviews it. Subject, To, the body
 * as an editable field, then Send with a five-second grace in which Undo has
 * the focus, then a sent stamp with the check drawing itself. The review,
 * sending-with-countdown and sent states are ported from Message Draft
 * (21st.dev 20077, tool-ui); its Slack branch, read-more fold and shadcn
 * buttons were not used. The one highlighted action is the screen's.
 */
export type DraftState = "review" | "sending" | "sent";
export const GRACE_MS = 5000;

export function DraftCard({
  subject,
  to,
  body,
  onBody,
  state,
  onSend,
  onUndo,
  sentLabel,
  primary = true,
  footer,
}: {
  subject: string;
  to: string;
  body: string;
  onBody(text: string): void;
  state: DraftState;
  onSend(): void;
  onUndo(): void;
  sentLabel: string;
  primary?: boolean;
  footer?: ReactNode;
}) {
  const reduce = useReducedMotion();
  const [left, setLeft] = useState(GRACE_MS / 1000);
  const undoRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (state !== "sending") return;
    setLeft(GRACE_MS / 1000);
    undoRef.current?.focus();
    const t = setInterval(() => setLeft((n) => Math.max(0, n - 1)), 1000);
    return () => clearInterval(t);
  }, [state]);
  return (
    <Panel
      as="article"
      className="grid gap-3 p-4"
      aria-label="Parent update draft"
      data-state={state}
    >
      <h2 className="text-section">{subject}</h2>
      <p className="text-dense text-muted">
        To <span className="text-text">{to}</span>
      </p>
      {state === "review" ? (
        <textarea
          value={body}
          onChange={(e) => onBody(e.target.value)}
          rows={Math.min(14, Math.max(6, body.split("\n").length + 1))}
          aria-label="Message to the parent"
          className="w-full resize-y rounded-control border border-border/70 bg-surface px-3 py-2 text-body leading-[22px] text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        />
      ) : (
        <p className="whitespace-pre-wrap text-body">{body}</p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3" aria-live="polite">
        {state === "review" ? (
          <>
            {footer ?? <span />}
            <GlassButton variant={primary ? "primary" : "glass"} onClick={onSend}>
              Send to {to}
            </GlassButton>
          </>
        ) : state === "sending" ? (
          <>
            <span className="tabular text-dense text-muted">Sending in {left}s</span>
            <GlassButton ref={undoRef} onClick={onUndo}>
              Undo
            </GlassButton>
          </>
        ) : (
          <span className="flex items-center gap-2 text-dense" role="status">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-positive-bg text-positive-ink">
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <motion.path
                  d="M5 12.5L10 17.5L19 7.5"
                  initial={reduce ? false : { pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: reduce ? 0 : 0.35, ease: "easeOut" }}
                />
              </svg>
            </span>
            <span className={cn("font-semibold")}>{sentLabel}</span>
          </span>
        )}
      </div>
    </Panel>
  );
}
