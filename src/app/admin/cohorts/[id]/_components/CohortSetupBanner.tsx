"use client";

// ============================================================
// Shown while a cohort hasn't been marked setup-complete (Cal
// event and Zoom still to wire up). "Mark setup complete" calls
// the server action; the banner goes away once the page refreshes.
// ============================================================

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { actionMarkCohortSetupComplete } from "../setup-actions";

export function CohortSetupBanner({ cohortId }: { cohortId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function onMarkComplete() {
    setErr(null);
    startTransition(async () => {
      try {
        await actionMarkCohortSetupComplete(cohortId);
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Couldn't mark complete");
      }
    });
  }

  return (
    <div
      className="wb-alert"
      style={{
        borderColor: "var(--warn)",
        background: "color-mix(in srgb, var(--warn) 8%, transparent)",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div style={{ flex: "1 1 240px", minWidth: 0 }}>
        <b>This cohort still needs Cal and Zoom setup.</b>
        <p className="wb-note" style={{ marginTop: 2 }}>
          Set up the class in Cal.com (event type, schedule, Zoom link), then mark it done.
          You&apos;ll get a reminder email each day until then.
        </p>
        {err && (
          <p role="alert" style={{ margin: "4px 0 0", color: "var(--late)" }}>
            {err}
          </p>
        )}
      </div>
      <button type="button" className="wb-btn" onClick={onMarkComplete} disabled={pending}>
        {pending ? "Saving…" : "Mark setup complete"}
      </button>
    </div>
  );
}
