"use client";

import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import MathText from "@/components/learn/MathText";
import type { ExamPreview } from "./exam-data";
import { sectionName } from "./ExamModuleScreen";
import { isCorrectAnswer, originalUrl } from "./grading";

/** Score and review: every answer against the printed key, which is not yet validated. */
export default function ExamResults({
  exam,
  answers,
  onRestart,
}: {
  exam: ExamPreview;
  answers: Record<string, string>;
  onRestart(): void;
}) {
  const rows = exam.modules.map((mod) => {
    const items = mod.questions.map((q) => {
      const numeric = q.question.answer_format === "numeric_entry";
      return {
        q,
        answer: answers[q.questionId] ?? "",
        right: isCorrectAnswer(answers[q.questionId], q.printedKey, numeric),
      };
    });
    return { mod, items, right: items.filter((i) => i.right).length };
  });
  const bySection = (section: "RW" | "MATH") => {
    const mods = rows.filter((r) => r.mod.section === section);
    return {
      right: mods.reduce((n, r) => n + r.right, 0),
      total: mods.reduce((n, r) => n + r.items.length, 0),
    };
  };
  return (
    <div className="min-h-screen bg-night px-4 py-10 text-ivory sm:px-6">
      <div className="mx-auto max-w-4xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-taupe">
          Exam preview · {exam.examId}
        </p>
        <h1 className="mt-2 text-3xl font-bold">Your answers</h1>
        <p className="mt-3 inline-block rounded-md border border-warning/40 bg-warning/10 px-3 py-1.5 text-sm font-semibold text-warning-bright">
          Printed key — not yet validated
        </p>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-taupe">
          Raw counts only, compared with the answer key printed in the source. No scaled score is
          shown. Nothing here was saved anywhere except this browser.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {(["RW", "MATH"] as const).map((section) => {
            const s = bySection(section);
            return (
              <div key={section} className="rounded-xl border border-bronze bg-surface p-5">
                <p className="text-sm text-taupe">{sectionName(section)}</p>
                <p className="mt-1 text-2xl font-bold tabular-nums">
                  {s.right} of {s.total} match the key
                </p>
              </div>
            );
          })}
        </div>

        {rows.map(({ mod, items, right }) => (
          <section key={`${mod.section}-${mod.module}`} className="mt-10">
            <h2 className="text-lg font-bold">
              {sectionName(mod.section)} · Module {mod.module}
              <span className="ml-3 text-sm font-normal text-taupe">
                {right} of {items.length}
              </span>
            </h2>
            <div className="mt-3 overflow-x-auto rounded-xl border border-bronze">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface text-xs uppercase tracking-wider text-taupe">
                  <tr>
                    <th className="px-3 py-2">Q</th>
                    <th className="px-3 py-2">Your answer</th>
                    <th className="px-3 py-2">Printed key</th>
                    <th className="px-3 py-2">Result</th>
                    <th className="px-3 py-2">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(({ q, answer, right: ok }) => (
                    <tr
                      key={q.questionId}
                      className="border-t border-bronze/60"
                      data-result={ok ? "right" : "wrong"}
                    >
                      <td className="px-3 py-2 font-semibold tabular-nums">
                        {q.number}
                        {q.incomplete && (
                          <span
                            className="ml-2 rounded border border-warning/40 bg-warning/10 px-1.5 py-0.5 text-[10px] font-semibold text-warning-bright"
                            title={q.issues.join("; ")}
                          >
                            capture incomplete
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {answer ? (
                          <MathText text={answer} />
                        ) : (
                          <span className="text-taupe">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {q.printedKey || <span className="text-taupe">none</span>}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 font-semibold",
                            ok ? "text-success-bright" : "text-error-bright"
                          )}
                        >
                          {ok ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                          {ok ? "Right" : answer ? "Wrong" : "Blank"}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <a
                          href={originalUrl(exam.examId, q.questionId)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-info-bright underline underline-offset-2"
                        >
                          original.png
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}

        <div className="mt-10 flex justify-end">
          <button type="button" onClick={onRestart} className="btn-secondary">
            Start the exam again
          </button>
        </div>
      </div>
    </div>
  );
}
