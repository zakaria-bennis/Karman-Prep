"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { dismissNoticeAction, leaveTutorAction } from "@/app/join/actions";
import "./affiliate.css";

export function LeaveGroupButton({ tutorName }: { tutorName: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      className="ka-textbtn"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(`Leave ${tutorName}'s group? You move to the Free plan.`)) return;
        startTransition(async () => {
          await leaveTutorAction();
          router.refresh();
        });
      }}
    >
      {pending ? "Leaving…" : "Leave the group"}
    </button>
  );
}

export function DismissNoticeButton({ linkId }: { linkId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      className="ka-textbtn"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await dismissNoticeAction({ linkId });
          router.refresh();
        })
      }
    >
      Got it
    </button>
  );
}
