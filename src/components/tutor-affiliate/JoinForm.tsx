"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, Cta, SectionHeader } from "@/components/portal";
import { redeemCodeAction } from "@/app/join/actions";
import "./affiliate.css";

type Result = Awaited<ReturnType<typeof redeemCodeAction>>;

function message(result: Result): string {
  if (result.ok) {
    return result.status === "already_joined"
      ? `You're already in ${result.tutorName}'s group.`
      : `You're in ${result.tutorName}'s group. You have the Practice plan.`;
  }
  switch (result.reason) {
    case "invalid_code":
      return "That code doesn't work. Check it with your tutor.";
    case "tutor_inactive":
      return `${result.tutorName}'s Karman plan isn't active right now, so the code can't add students.`;
    case "full":
      return `${result.tutorName}'s group is full. Ask them about it.`;
    case "removed_by_tutor":
      return `${result.tutorName} removed you from this group. Ask them for a new code.`;
    case "linked_elsewhere":
      return `You're in ${result.currentTutorName}'s group. Switch to ${result.tutorName}'s group?`;
    case "not_student":
      return "Tutor codes are for student accounts.";
    case "no_account":
      return "Finish setting up your account first, then add the code.";
    default:
      return result.message;
  }
}

/** A student types their tutor's code to join the group and get Practice free. */
export default function JoinForm({ initialCode }: { initialCode: string }) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode);
  const [result, setResult] = useState<Result | null>(null);
  const [pending, startTransition] = useTransition();

  function send(switchTutor: boolean) {
    startTransition(async () => {
      const next = await redeemCodeAction({ code, switchTutor });
      setResult(next);
      if (next.ok) router.refresh();
    });
  }

  const askSwitch = result && !result.ok && result.reason === "linked_elsewhere";

  return (
    <Card>
      <SectionHeader title="Join your tutor's group" />
      <form
        className="ka-stack"
        onSubmit={(event) => {
          event.preventDefault();
          send(false);
        }}
      >
        <label className="ka-field">
          Your tutor&apos;s code
          <input
            className="ka-input"
            name="code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="ABCD-EFGH"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={20}
            required
          />
        </label>
        <div className="kp-cta-row">
          <Cta type="submit" disabled={pending}>
            {pending ? "Checking…" : "Join"}
          </Cta>
          {askSwitch && (
            <button
              type="button"
              className="ka-textbtn"
              onClick={() => send(true)}
              disabled={pending}
            >
              Switch groups
            </button>
          )}
        </div>
        <p
          className="ka-status"
          role="status"
          data-tone={result && !result.ok && !askSwitch ? "error" : undefined}
        >
          {result ? message(result) : ""}
        </p>
      </form>
    </Card>
  );
}
