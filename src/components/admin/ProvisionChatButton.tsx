"use client";

// ============================================================
// ProvisionChatButton — admin-only inline trigger for the
// /api/cohorts/provision route. Idempotent: clicking on an
// already-provisioned cohort is safe and just reports back the
// existing channel ids.
//
// Used in the cohort detail page header.
// ============================================================

import { useState } from "react";
import { Loader2, MessageSquarePlus, CheckCircle2, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";

interface Props {
  cohortId: string;
  /** When true, channels already exist in chat_channels — render a
   *  "provisioned ✓" pill instead of the button. */
  alreadyProvisioned: boolean;
}

interface ProvisionResult {
  cohortChatChannelId?: string;
  qaChannelId?: string;
  createdNow?: number;
  error?: string;
}

export function ProvisionChatButton({ cohortId, alreadyProvisioned }: Props) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "running" | "ok" | "error">(
    alreadyProvisioned ? "ok" : "idle"
  );
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [createdCount, setCreatedCount] = useState<number | null>(null);

  async function provision() {
    setState("running");
    setErrMsg(null);
    try {
      const res = await fetch("/api/cohorts/provision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cohortId }),
      });
      const body = (await res.json().catch(() => ({}))) as ProvisionResult;
      if (!res.ok) {
        setState("error");
        setErrMsg(body.error ?? `Provision failed (${res.status})`);
        return;
      }
      setState("ok");
      setCreatedCount(body.createdNow ?? 0);
      // Refresh the server component so the header pill updates.
      router.refresh();
    } catch (err) {
      setState("error");
      setErrMsg((err as Error).message ?? "Network error");
    }
  }

  if (state === "ok") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-success/40 bg-success/10 px-2 py-0.5 text-xs font-semibold text-success dark:border-success/30 dark:bg-success/10 dark:text-success-bright">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Slack channels provisioned
        {createdCount !== null && createdCount > 0 ? ` (created ${createdCount} now)` : ""}
      </span>
    );
  }

  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={provision}
        disabled={state === "running"}
        className="inline-flex items-center gap-1.5 rounded-md bg-info px-3 py-1.5 text-xs font-semibold text-ivory hover:bg-info-bright disabled:opacity-50"
      >
        {state === "running" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <MessageSquarePlus className="h-3.5 w-3.5" />
        )}
        {state === "running" ? "Provisioning…" : "Provision Slack channels"}
      </button>
      {state === "error" && errMsg && (
        <span className="inline-flex items-center gap-1 text-xs text-error dark:text-error-bright">
          <AlertTriangle className="h-3.5 w-3.5" />
          {errMsg}
        </span>
      )}
    </div>
  );
}
