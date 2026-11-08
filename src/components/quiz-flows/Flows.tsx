"use client";
// One client entry per flow, so each page passes plain data and the right server action is bound
// here (server actions cannot be wrapped in closures across the server/client boundary).
import { useCallback } from "react";
import {
  actionOpenDailyTen,
  actionStartDiagnostic,
  actionStartDomainQuiz,
  actionStartFullTest,
  actionStartPracticeSet,
} from "@/app/learn/quiz-run-actions";
import { Message } from "./FlowFrame";
import { RunPlayer } from "./RunPlayer";
import type { ShellUser } from "./types";

export function DailyTenFlow({ user }: { user: ShellUser }) {
  const open = useCallback(
    () => actionOpenDailyTen({ timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
    []
  );
  return <RunPlayer user={user} open={open} exitHref="/dashboard/student" />;
}

export function PracticeSetFlow({
  user,
  skillId,
  exitHref,
  lessonHref,
}: {
  user: ShellUser;
  skillId: string;
  exitHref: string;
  lessonHref: string | null;
}) {
  const open = useCallback(() => actionStartPracticeSet({ skillId }), [skillId]);
  return (
    <RunPlayer
      user={user}
      open={open}
      exitHref={exitHref}
      lessonHref={lessonHref}
      againHref={`/learn/set/${encodeURIComponent(skillId)}?again=${Date.now()}`}
    />
  );
}

export function DomainQuizFlow({
  user,
  domainId,
  label,
  exitHref,
}: {
  user: ShellUser;
  domainId: string;
  label: string;
  exitHref: string;
}) {
  const open = useCallback(() => actionStartDomainQuiz({ domainId }), [domainId]);
  return (
    <RunPlayer
      user={user}
      open={open}
      exitHref={exitHref}
      intro={(start, pending) => (
        <Message
          title={`${label} quiz`}
          text="About 12 questions across this Domain's skills. Each answer is checked as you go. A skill moves up a level when every question on it is right."
          action={{ onClick: start, label: pending ? "Loading" : "Start the quiz" }}
          back={{ href: exitHref, label: "Back" }}
        />
      )}
    />
  );
}

export function FullTestFlow({
  user,
  form,
  resumable,
}: {
  user: ShellUser;
  form: number;
  resumable: boolean;
}) {
  const open = useCallback(() => actionStartFullTest({ form }), [form]);
  return (
    <RunPlayer
      user={user}
      open={open}
      exitHref="/learn/tests"
      intro={
        resumable
          ? undefined
          : (start, pending) => (
              <Message
                title={`Full-length practice test ${form}`}
                text="Reading and Writing: two modules of 27 questions, 32 minutes each. Then a break. Then Math: two modules of 22 questions, 35 minutes each. The second module of each section is easier or harder depending on the first. You can leave and come back; your answers are saved when each module is submitted."
                action={{
                  onClick: start,
                  label: pending ? "Loading" : "Start Reading and Writing",
                }}
                back={{ href: "/learn/tests", label: "Back to tests" }}
              />
            )
      }
    />
  );
}

export function DiagnosticFlow({ user, resumable }: { user: ShellUser; resumable: boolean }) {
  const open = useCallback(() => actionStartDiagnostic(), []);
  return (
    <RunPlayer
      user={user}
      open={open}
      exitHref="/dashboard/student"
      intro={
        resumable
          ? undefined
          : (start, pending) => (
              <Message
                title="Diagnostic"
                text="35 questions from Karman's question bank: Reading and Writing (18 questions, 22 minutes), then a break, then Math (17 questions, 27 minutes). It shows where to start."
                action={{ onClick: start, label: pending ? "Loading" : "Start the diagnostic" }}
                back={{ href: "/dashboard/student", label: "Back" }}
              />
            )
      }
    />
  );
}
