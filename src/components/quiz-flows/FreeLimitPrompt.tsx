"use client";
// The upgrade prompt every quiz path shows when the Free plan's limit is reached
// (see src/lib/assembler/plan-limit.ts). Kept free of the portal shell so the older quiz
// screens can show it too.
import Link from "next/link";

export function FreeLimitPrompt({
  text,
  back,
}: {
  text: string;
  back?: { href: string; label: string };
}) {
  return (
    <section role="alert" className="mb-6 rounded-xl border border-bronze p-5">
      <h2 className="text-lg font-semibold">That is the end of the Free plan</h2>
      <p className="mt-2 text-sm leading-relaxed">{text}</p>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <Link href="/billing" className="rounded-full bg-gold px-4 py-2 text-sm font-semibold">
          See plans
        </Link>
        {back && (
          <Link href={back.href} className="text-sm underline underline-offset-4">
            {back.label}
          </Link>
        )}
      </div>
    </section>
  );
}
