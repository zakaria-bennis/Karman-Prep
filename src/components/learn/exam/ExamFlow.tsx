"use client";
// One full-length exam from the start page to the ending. The server keeps the exam's clock and state
// (src/lib/exams/service.ts); this screen shows whatever stage it is in and moves on with it.
import { useCallback, useState } from "react";
import { FlowStage } from "@/components/quiz-flows/FlowStage";
import {
  actionExamEndBreak,
  actionExamSave,
  actionExamStart,
  actionExamState,
  actionExamSubmit,
  type ExamActionResult,
} from "@/app/learn/exam-actions";
import type { SittingView, StartInfo } from "@/lib/exams/service";
import { ExamBreak } from "./ExamBreak";
import { ExamEnding } from "./ExamEnding";
import { ExamModule } from "./ExamModule";
import { ExamStart } from "./ExamStart";
import { browserZone } from "./format";
import s from "./exam.module.css";

const BACK = { href: "/learn/tests", label: "Exams" };

export function ExamFlow({
  form,
  start,
  initial,
}: {
  form: number;
  start: StartInfo | null;
  initial: SittingView | null;
}) {
  const [view, setView] = useState<SittingView | null>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const take = useCallback(async (work: () => Promise<ExamActionResult<SittingView | null>>) => {
    setBusy(true);
    setError(null);
    try {
      const res = await work();
      if (res.ok) {
        if (res.value) setView(res.value);
      } else setError(res.error);
    } catch {
      setError("The connection dropped. Your saved answers are safe. Try again.");
    } finally {
      setBusy(false);
    }
  }, []);

  const refresh = useCallback(() => void take(() => actionExamState({ form })), [form, take]);

  if (view?.stage === "module")
    return (
      <ExamModule
        key={`${view.sittingId}:${view.module.key}`}
        sittingId={view.sittingId}
        module={view.module}
        serverNow={view.serverNow}
        onSave={async (answers) => {
          const res = await actionExamSave({
            sittingId: view.sittingId,
            module: view.module.key,
            answers,
          });
          // Time ran out on the server: move on with what it kept.
          if (!res.ok && res.kind === "late") refresh();
        }}
        onSubmit={async (answers) => {
          const res = await actionExamSubmit({
            sittingId: view.sittingId,
            module: view.module.key,
            answers,
          });
          if (res.ok) setView(res.value);
          else {
            const again = await actionExamState({ form });
            if (again.ok && again.value) setView(again.value);
          }
        }}
      />
    );

  return (
    <FlowStage back={BACK}>
      {view?.stage === "break" && (
        <ExamBreak
          endsAt={view.endsAt}
          serverNow={view.serverNow}
          busy={busy}
          onResume={() => void take(() => actionExamEndBreak({ sittingId: view.sittingId }))}
          onOver={refresh}
        />
      )}
      {view?.stage === "done" && <ExamEnding result={view.result} />}
      {!view && start && (
        <ExamStart
          info={start}
          busy={busy}
          error={error}
          onStart={() => void take(() => actionExamStart({ form, timeZone: browserZone() }))}
        />
      )}
      {error && view && <p className={`${s.pane} ${s.narrow} ${s.error}`}>{error}</p>}
    </FlowStage>
  );
}
