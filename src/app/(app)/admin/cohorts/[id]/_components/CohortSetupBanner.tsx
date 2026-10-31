"use client";

// ============================================================
// Banner shown when a group/small_group cohort hasn't been
// marked setup-complete. The "Mark setup complete" button calls
// the server action; on success the banner goes away after the
// page revalidates. While clicked we show a tiny spinner.
// Carved out of the old monolithic CohortDetailClient.tsx
// (audit M1).
// ============================================================

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
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
    <div className="mb-6 flex flex-wrap items-start gap-3 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
      <div className="min-w-[15rem] flex-1">
        <p className="font-semibold text-warning-bright">This cohort still needs Cal/Zoom setup</p>
        <p className="mt-0.5 text-xs text-warning-bright/80">
          Configure the seminar event in Cal.com (event-type, schedule, Zoom location) for this
          cohort, then click the button to dismiss this banner. You&apos;ll get a daily reminder
          email until it&apos;s marked complete.
        </p>
        {err ? <p className="mt-1.5 text-xs text-error-bright">{err}</p> : null}
      </div>
      <button
        onClick={onMarkComplete}
        disabled={pending}
        className="inline-flex items-center gap-1 rounded-md border border-success/40 bg-success/10 px-3 py-1.5 text-xs font-semibold text-success-bright hover:bg-success/20 disabled:opacity-50"
      >
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <CheckCircle2 className="h-3.5 w-3.5" />
        )}
        Mark setup complete
      </button>
    </div>
  );
}
