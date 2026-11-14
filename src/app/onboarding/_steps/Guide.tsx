"use client";

import { Fox } from "@/components/portal/Fox";

/**
 * The fox, guiding the intake: it says one short line in a speech bubble and hops a little each time the
 * line changes. Learned from Duolingo's onboarding (docs/forms/onboarding-notes.md): a guide that reacts to
 * each answer makes a list of questions feel like a conversation.
 */
export function Guide({ say, big = false }: { say: string; big?: boolean }) {
  return (
    <div className={big ? "flex flex-col items-center gap-4 text-center" : "flex items-end gap-3"}>
      <div
        key={say}
        className="shrink-0 motion-safe:animate-[guide-hop_.45s_cubic-bezier(.3,1.5,.5,1)]"
      >
        <Fox size={big ? 112 : 56} />
      </div>
      <p
        key={`${say}-line`}
        aria-live="polite"
        className={
          big
            ? "max-w-sm text-balance text-2xl font-extrabold leading-snug text-ivory motion-safe:animate-[guide-say_.3s_ease-out]"
            : "mb-2 rounded-2xl rounded-bl-md border border-ivory/15 bg-surface/60 px-4 py-2.5 text-[15px] font-semibold leading-snug text-ivory motion-safe:animate-[guide-say_.3s_ease-out] dark:bg-surface-raised/60"
        }
      >
        {say}
      </p>
    </div>
  );
}
