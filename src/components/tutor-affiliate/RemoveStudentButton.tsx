"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { removeStudentAction } from "@/app/tutor/affiliate-actions";
import "./affiliate.css";

export default function RemoveStudentButton({
  studentUserId,
  name,
  redirectTo,
}: {
  studentUserId: string;
  name: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function remove() {
    if (
      !window.confirm(
        `Remove ${name} from your group? They move to the Free plan and their open homework from you is cleared.`
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await removeStudentAction({ studentUserId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (redirectTo) router.push(redirectTo);
      else router.refresh();
    });
  }

  return (
    <span>
      <button type="button" className="ka-textbtn" onClick={remove} disabled={pending}>
        {pending ? "Removing…" : "Remove from my group"}
      </button>
      {error && (
        <span className="ka-status" role="alert" data-tone="error">
          {" "}
          {error}
        </span>
      )}
    </span>
  );
}
