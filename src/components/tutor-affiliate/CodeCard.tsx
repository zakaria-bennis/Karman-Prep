"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, Cta, SectionHeader } from "@/components/portal";
import { regenerateCodeAction } from "@/app/tutor/affiliate-actions";
import "./affiliate.css";

/** The tutor's code: copy it, share the join link, or make a new one. */
export default function CodeCard({
  code,
  link,
  canRegenerate,
}: {
  code: string | null;
  link: string | null;
  canRegenerate: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<{ text: string; error?: boolean } | null>(null);
  const [pending, startTransition] = useTransition();

  async function copy(text: string, what: string) {
    try {
      await navigator.clipboard.writeText(text);
      setStatus({ text: `${what} copied.` });
    } catch {
      setStatus({ text: `Couldn't copy. Select it and copy it yourself: ${text}`, error: true });
    }
  }

  async function share() {
    if (!link || !code) return;
    const text = `Join my group on Karman with code ${code}. You get the Practice plan free.`;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "Join my Karman group", text, url: link });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    await copy(link, "Join link");
  }

  function regenerate() {
    if (!window.confirm("Make a new code? The old code stops working. Students who joined stay.")) {
      return;
    }
    startTransition(async () => {
      const result = await regenerateCodeAction();
      setStatus(
        result.ok ? { text: result.message ?? "Done." } : { text: result.error, error: true }
      );
      router.refresh();
    });
  }

  return (
    <Card>
      <SectionHeader title="Your code" />
      {code ? (
        <div className="ka-stack">
          <span className="ka-code" aria-label={`Your code is ${code.split("").join(" ")}`}>
            {code}
          </span>
          <div className="kp-cta-row">
            <Cta onClick={share}>Share your join link</Cta>
            <button type="button" className="ka-textbtn" onClick={() => copy(code, "Code")}>
              Copy code
            </button>
            {link && (
              <button type="button" className="ka-textbtn" onClick={() => copy(link, "Join link")}>
                Copy link
              </button>
            )}
            {canRegenerate && (
              <button type="button" className="ka-textbtn" onClick={regenerate} disabled={pending}>
                {pending ? "Making a new code…" : "Make a new code"}
              </button>
            )}
          </div>
        </div>
      ) : (
        <p className="kp-meta">Your code appears here once your plan is active.</p>
      )}
      <p className="ka-status" role="status" data-tone={status?.error ? "error" : undefined}>
        {status?.text ?? ""}
      </p>
    </Card>
  );
}
