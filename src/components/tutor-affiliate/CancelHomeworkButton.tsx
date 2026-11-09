"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelHomeworkAction } from "@/app/tutor/affiliate-actions";
import "./affiliate.css";

export default function CancelHomeworkButton({
  homeworkId,
  studentClerkId,
  title,
}: {
  homeworkId: string;
  studentClerkId: string;
  title: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      className="ka-textbtn"
      disabled={pending}
      aria-label={`Cancel ${title}`}
      onClick={() =>
        startTransition(async () => {
          const result = await cancelHomeworkAction({ homeworkId, studentClerkId });
          if (!result.ok) window.alert(result.error);
          router.refresh();
        })
      }
    >
      {pending ? "Cancelling…" : "Cancel"}
    </button>
  );
}
