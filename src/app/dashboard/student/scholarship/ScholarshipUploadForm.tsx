"use client";

import { useActionState, useState } from "react";
import { ChevronRight, FileUp } from "lucide-react";
import { actionSubmitScholarshipClaim } from "./actions";

const MAX_MB = 10;

export default function ScholarshipUploadForm({
  cohorts,
  hasClaim,
}: {
  cohorts: Array<{ id: string; name: string }>;
  hasClaim: boolean;
}) {
  const [state, formAction, pending] = useActionState(actionSubmitScholarshipClaim, null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form
      action={formAction}
      className="space-y-5 rounded-lg border border-bronze/40 bg-surface p-5"
    >
      <h2 className="text-base font-semibold text-foreground">
        {hasClaim ? "Upload a new score report" : "Upload your score report"}
      </h2>

      {cohorts.length === 1 ? (
        <input type="hidden" name="cohortId" value={cohorts[0].id} />
      ) : (
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-foreground">Cohort</span>
          <select
            name="cohortId"
            required
            className="min-h-11 w-full rounded-md border border-bronze/40 bg-background px-3 text-sm text-foreground"
          >
            {cohorts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-foreground">Total score</span>
          <input
            name="declaredTotalScore"
            type="number"
            inputMode="numeric"
            min={400}
            max={1600}
            step={10}
            required
            className="min-h-11 w-full rounded-md border border-bronze/40 bg-background px-3 text-sm tabular-nums text-foreground"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-foreground">Test date</span>
          <input
            name="declaredTestDate"
            type="date"
            max={today}
            required
            className="min-h-11 w-full rounded-md border border-bronze/40 bg-background px-3 text-sm text-foreground"
          />
        </label>
      </div>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-foreground">Score report (PDF)</span>
        <span className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-dashed border-bronze/40 bg-background px-3 py-2 text-sm text-taupe focus-within:ring-2 focus-within:ring-gold-bright">
          <FileUp aria-hidden className="size-4 shrink-0" />
          <span className="truncate">
            {fileName ?? `Choose the PDF from your College Board account (up to ${MAX_MB} MB)`}
          </span>
          <input
            name="report"
            type="file"
            accept="application/pdf,.pdf"
            required
            className="sr-only"
            onChange={(e) => {
              const f = e.currentTarget.files?.[0];
              setFileName(f?.name ?? null);
              setFileError(
                f && f.size > MAX_MB * 1024 * 1024 ? `The file is larger than ${MAX_MB} MB.` : null
              );
            }}
          />
        </span>
      </label>

      <label className="flex items-start gap-3 text-sm text-foreground">
        <input name="confirm" type="checkbox" required className="mt-0.5 size-4" />
        <span>This is my official College Board score report, downloaded and not changed.</span>
      </label>

      {(fileError || (state && !state.ok)) && (
        <p role="alert" className="text-sm font-medium text-error">
          {fileError ?? (state && !state.ok ? state.error : null)}
        </p>
      )}
      {state?.ok && (
        <p role="status" className="text-sm font-medium text-foreground">
          Uploaded. We&apos;ll check it and email you.
        </p>
      )}

      <button
        type="submit"
        disabled={pending || Boolean(fileError)}
        className="bg-primary text-primary-foreground inline-flex min-h-11 items-center gap-2 rounded-md px-4 text-sm font-semibold disabled:opacity-60"
      >
        {pending ? "Uploading…" : "Upload score report"}
        <ChevronRight aria-hidden className="size-4" />
      </button>
    </form>
  );
}
