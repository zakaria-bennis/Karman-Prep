"use client";

// The diagnostic on the shared quiz shell (quiz engine spec: end-graded, Bluebook style).
// Each section runs on its own countdown; answers post once to /api/diagnostic/submit,
// which returns the scoring that drives the results screen.

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { DOMAIN_SECTION } from "@/types";
import type { ScoredDiagnostic } from "@/lib/diagnostic-scoring";
import { modeFor } from "@/lib/quiz/mode";
import { clearWorkspaces } from "@/lib/quiz/workspace";
import { QuizShell } from "@/components/learn/quiz-shell/QuizShell";
import DiagnosticResults from "./DiagnosticResults";
import {
  SECTION_SECONDS,
  sectionsOf,
  toShellQuestion,
  type DiagnosticQuestion,
} from "./diagnostic-question";

export type { DiagnosticQuestion } from "./diagnostic-question";

interface Props {
  questions: DiagnosticQuestion[];
  /** Whether the viewing user is already a paying / trialing subscriber (results copy). */
  isSubscribed: boolean;
  /** A second or later attempt granted by an admin: this submission replaces the baseline. */
  isRetake?: boolean;
}

export default function DiagnosticClient({ questions, isSubscribed, isRetake }: Props) {
  const router = useRouter();
  const sections = useMemo(() => sectionsOf(questions), [questions]);
  const [section, setSection] = useState(0);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [scoring, setScoring] = useState<ScoredDiagnostic | null>(null);
  const [error, setError] = useState<string | null>(null);

  const current = sections[section] ?? "math";
  const sectionQuestions = useMemo(
    () => questions.filter((q) => DOMAIN_SECTION[q.domain] === current).map(toShellQuestion),
    [questions, current]
  );
  const attemptKey = `diagnostic-${current}`;

  // Warn before closing the tab while the diagnostic is in progress.
  useEffect(() => {
    if (scoring) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [scoring]);

  async function submitAll() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/diagnostic/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: questions.map((q) => ({
            questionId: q.id,
            selectedAnswer: answers[q.id] || "",
          })),
        }),
      });
      const data = (await res.json()) as { scoring?: ScoredDiagnostic; error?: string };
      if (res.ok && data.scoring) {
        for (const s of sections) clearWorkspaces(`diagnostic-${s}`);
        setScoring(data.scoring);
      } else setError("Your answers could not be scored. Try submitting again.");
    } catch {
      setError("Your answers could not be sent. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function finishSection() {
    if (section + 1 < sections.length) {
      setSection(section + 1);
      setIndex(0);
      setStartedAt(Date.now());
      return;
    }
    void submitAll();
  }

  if (scoring)
    return (
      <DiagnosticResults
        scoring={scoring}
        totalQuestions={questions.length}
        answers={answers}
        questions={questions}
        isSubscribed={isSubscribed}
        bookmarkedIds={bookmarks}
      />
    );

  const notice =
    error ??
    (isRetake && section === 0 && index === 0
      ? "You are retaking the diagnostic. Submitting creates a new result next to your earlier one, so your progress chart shows both."
      : null);

  return (
    <QuizShell
      key={attemptKey}
      mode={modeFor("diagnostic", { baseSeconds: SECTION_SECONDS[current], hasTutor: false })}
      questions={sectionQuestions}
      attemptKey={attemptKey}
      index={index}
      section={current === "math" ? "Math" : "Reading and Writing"}
      topic="Diagnostic"
      reviews={{}}
      loading={submitting}
      startedAtMs={startedAt}
      hasCalculator={current === "math"}
      onNavigate={setIndex}
      onSelectAnswer={(id, answer) =>
        setAnswers((all) => {
          const next = { ...all };
          if (answer) next[id] = answer;
          else delete next[id];
          return next;
        })
      }
      onFinish={finishSection}
      onExit={() => router.replace(isSubscribed ? "/dashboard/student" : "/")}
      onToggleBookmark={(id, on) =>
        setBookmarks((all) =>
          on ? [...all.filter((x) => x !== id), id] : all.filter((x) => x !== id)
        )
      }
      feedback={
        notice ? (
          <p role={error ? "alert" : "note"} className="mt-6 text-sm">
            {notice}
          </p>
        ) : null
      }
    />
  );
}
