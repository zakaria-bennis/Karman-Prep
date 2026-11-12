"use client";

// ============================================================
// QuizHistoryTab — every quiz attempt by this student, opening
// in place to show the adaptive path and individual question
// responses. Each attempt's score is a ring (portal rule: progress
// is a ring); the path reads at a glance as one square per question.
// Portal look: student-detail.css.
// ============================================================

import { useMemo, useState } from "react";
import { Check, X as XIcon } from "lucide-react";
import { Num } from "@/components/portal/primitives";
import { Ring } from "@/components/portal/Ring";
import { Chevron } from "@/components/portal/icons";
import type { QuizAttempt, QuestionResponse, ConfidenceBand } from "@/types/quiz";
import { CONFIDENCE_COLORS } from "@/types/quiz";
import { getNode } from "@/data/curriculum";

interface Props {
  attempts: QuizAttempt[];
  responsesByAttempt: Record<string, QuestionResponse[]>;
}

/** The ring's colour for a score: good from 80, amber from 60, late below. */
function scoreColor(score: number) {
  return score >= 80 ? "var(--good)" : score >= 60 ? "var(--kp-st-warn)" : "var(--late)";
}

export default function QuizHistoryTab({ attempts, responsesByAttempt }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...attempts].sort((a, b) => b.started_at.localeCompare(a.started_at)),
    [attempts]
  );

  if (sorted.length === 0) {
    return <p className="kp-st-empty">No quiz attempts yet.</p>;
  }

  return (
    <ul className="kp-st-attempts">
      {sorted.map((a) => {
        const node = getNode("reading", a.node_id) ?? getNode("math", a.node_id) ?? null;
        const nodeTopic = node?.topic ?? a.node_id;

        const band = a.confidence_band as ConfidenceBand | null;
        const bandStyle = band ? CONFIDENCE_COLORS[band] : null;
        const responses = responsesByAttempt[a.id] ?? [];
        const timeTaken =
          a.completed_at && a.started_at
            ? Math.round(
                (new Date(a.completed_at).getTime() - new Date(a.started_at).getTime()) / 1000
              )
            : null;
        const isOpen = openId === a.id;

        // Adaptive path difficulty distribution summary
        const diffs = a.adaptive_path.map((s) => s.difficulty);
        const distinct = Array.from(new Set(diffs));
        const panelId = `attempt-${a.id}`;

        return (
          <li key={a.id} className="kp-st-attempt" data-open={isOpen ? "" : undefined}>
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => setOpenId(isOpen ? null : a.id)}
            >
              {a.score !== null ? (
                <Ring
                  value={a.score / 100}
                  label={`Score ${a.score}%`}
                  size={52}
                  color={scoreColor(a.score)}
                >
                  <Num>{a.score}%</Num>
                </Ring>
              ) : (
                <Ring value={0} label="Incomplete" size={52}>
                  –
                </Ring>
              )}
              <span>
                <b>
                  {nodeTopic} <span className="kp-meta">#{a.attempt_number}</span>
                </b>
                <small>
                  {new Date(a.started_at).toLocaleString()}
                  {timeTaken !== null && (
                    <>
                      {" · "}
                      {Math.floor(timeTaken / 60)}m {timeTaken % 60}s
                    </>
                  )}
                  {" · "}Reached: {distinct.join(" → ") || "—"}
                  {a.score === null && " · Incomplete"}
                </small>
                {bandStyle && band && (
                  <span className="kp-st-band" data-band={band}>
                    {bandStyle.label}
                  </span>
                )}
              </span>
              <Chevron />
            </button>

            {isOpen && (
              <div className="kp-st-path" id={panelId}>
                <h4 className="kp-meta">Adaptive path</h4>
                {a.adaptive_path.length === 0 ? (
                  <p className="kp-meta">No steps recorded.</p>
                ) : (
                  <>
                    <div className="kp-st-trail" aria-hidden="true">
                      {a.adaptive_path.map((step, i) => (
                        <i key={i} data-right={step.was_correct ? "" : undefined} />
                      ))}
                    </div>
                    <ol className="kp-st-steps">
                      {a.adaptive_path.map((step, i) => {
                        const r = responses.find((x) => x.question_id === step.question_id);
                        return (
                          <li key={i}>
                            <span>{i + 1}</span>
                            <span
                              className="kp-st-mark"
                              data-right={step.was_correct ? "" : undefined}
                            >
                              {step.was_correct ? (
                                <Check aria-label="Right" />
                              ) : (
                                <XIcon aria-label="Wrong" />
                              )}
                            </span>
                            <b>{step.difficulty}</b>
                            {r ? (
                              <span className="kp-meta">
                                — chose {r.student_answer} in {r.response_time_seconds}s
                              </span>
                            ) : (
                              <span />
                            )}
                          </li>
                        );
                      })}
                    </ol>
                  </>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
