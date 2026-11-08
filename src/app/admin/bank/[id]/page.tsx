// ============================================================
// /admin/bank/[id] — one question, read-only: stem, choices,
// correct answer, explanation, skill, domain, difficulty and
// status fields, plus its import-team flags and a flag form.
// Math and figures show as stored text; nothing is rendered or
// changed here.
// ============================================================

import Link from "next/link";
import type { ReactNode } from "react";
import {
  WbEmpty,
  WbPage,
  WbPill,
  WbSection,
  WbTable,
  formatDate,
  type WbColumn,
} from "@/components/admin/workbench";
import {
  FLAG_REASONS,
  difficultyBand,
  domainLabel,
  flagReasonLabel,
  getBankQuestion,
  humanize,
  listQuestionFlags,
  publishTone,
  shortId,
  skillLabel,
  type BankQuestion,
  type ImportFlag,
} from "@/lib/admin/bank";
import { FlagForm, ResolveFlagButton } from "../FlagForm";

export const dynamic = "force-dynamic";

const textBlock = { whiteSpace: "pre-wrap", overflowWrap: "anywhere", margin: 0 } as const;
const back = <Link href="/admin/bank">Back to the question bank</Link>;

function TextBlock({ label, text }: { label?: string; text: string | null }) {
  if (!text) return null;
  return (
    <div style={{ display: "grid", gap: 4 }}>
      {label && <b>{label}</b>}
      <p style={textBlock}>{text}</p>
    </div>
  );
}

function difficultyText(level: number | null): string {
  if (level === null) return "Not rated";
  const band = difficultyBand(level);
  return `${level} of 7 (${band ?? "outside 1 to 7"})`;
}

const orDash = (value: string | null) => (value ? humanize(value) : "—");

function details(q: BankQuestion): Array<[string, ReactNode]> {
  const skillDiffers = q.rowSkillId !== null && q.rowSkillId !== q.skillId;
  return [
    ["Id", q.id],
    ["Domain", domainLabel(q.domain)],
    [
      "Skill",
      <>
        {skillLabel(q.skillId)}
        {skillDiffers && (
          <span className="wb-note" style={{ display: "block" }}>
            The question row says {skillLabel(q.rowSkillId)}.
          </span>
        )}
      </>,
    ],
    ["Difficulty", difficultyText(q.level)],
    ["Correct answer", q.correctAnswer ?? "—"],
    ["Question type", orDash(q.questionType)],
    ["Answer format", orDash(q.answerFormat)],
    [
      "Publish status",
      <WbPill key="publish" tone={publishTone(q.publishStatus)}>
        {q.publishStatus ? humanize(q.publishStatus) : "No status"}
      </WbPill>,
    ],
    ["Import status", orDash(q.importStatus)],
    ["Live", q.isLive ? "Yes" : "No"],
    ["Archived", q.archivedAt ? formatDate(q.archivedAt) : "No"],
    ["Answer key status", orDash(q.answerKeyStatus)],
    ["Answer check", orDash(q.answerCheckStatus)],
    ["Figure", q.figureKind ? humanize(q.figureKind) : q.imageUrl ? "Image" : "None"],
    ["Added", formatDate(q.createdAt)],
    ["Updated", formatDate(q.updatedAt)],
  ];
}

const flagColumns: WbColumn<ImportFlag>[] = [
  { key: "reason", label: "Reason", cell: (row) => flagReasonLabel(row.reason) },
  { key: "note", label: "Note", cell: (row) => row.note ?? "No note" },
  { key: "created", label: "Flagged", cell: (row) => formatDate(row.createdAt) },
  {
    key: "status",
    label: "Status",
    cell: (row) =>
      row.status === "open" ? (
        <WbPill tone="warn">Open</WbPill>
      ) : (
        <WbPill tone="ok">Resolved {formatDate(row.resolvedAt)}</WbPill>
      ),
  },
  {
    key: "action",
    label: "Action",
    cell: (row) =>
      row.status === "open" ? (
        <ResolveFlagButton flagId={row.id} questionId={row.questionId} />
      ) : (
        "—"
      ),
  },
];

export default async function BankQuestionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let question: BankQuestion | null;
  let flags: ImportFlag[];
  try {
    question = await getBankQuestion(id);
    flags = question ? await listQuestionFlags(question.id) : [];
  } catch (err) {
    console.error("[admin/bank]", err);
    return (
      <WbPage title="Question" actions={back}>
        <p role="alert" className="wb-alert">
          This question could not be loaded. Reload the page to try again.
        </p>
      </WbPage>
    );
  }

  if (!question) {
    return (
      <WbPage title="Question not found" actions={back}>
        <WbEmpty title={`No question has the id ${id.slice(0, 64)}.`}>
          <span>
            Check the id, or <Link href="/admin/bank">search the bank</Link>.
          </span>
        </WbEmpty>
      </WbPage>
    );
  }

  const q = question;
  return (
    <WbPage
      title={`Question ${shortId(q.id)}`}
      summary="Read-only. To fix something, flag it for the import team."
      actions={back}
    >
      <div className="wb-grid" data-columns="2">
        <div className="wb-grid">
          <WbSection title="Question">
            <div style={{ display: "grid", gap: 12 }}>
              <TextBlock text={q.passageIntro} />
              <TextBlock label="Text 1" text={q.passageA} />
              <TextBlock label="Text 2" text={q.passageB} />
              <TextBlock text={q.passage} />
              {q.stem ? <TextBlock text={q.stem} /> : <p className="wb-note">No stem text.</p>}
              {(q.figureKind || q.imageUrl) && (
                <p className="wb-note">This question has a figure. Figures are not drawn here.</p>
              )}
            </div>
          </WbSection>

          <WbSection title="Answer choices">
            {q.choices.length === 0 ? (
              <p className="wb-note">No answer choices on this question.</p>
            ) : (
              <ul className="wb-reasons">
                {q.choices.map((choice) => (
                  <li key={choice.letter}>
                    <b>{choice.letter}</b>
                    <span style={textBlock}>
                      {choice.text || "No choice text"}
                      {choice.isCorrect && (
                        <>
                          {" "}
                          <WbPill tone="ok">Correct</WbPill>
                        </>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </WbSection>

          <WbSection title="Explanation">
            {q.explanation ? (
              <p style={textBlock}>{q.explanation}</p>
            ) : (
              <p className="wb-note">No explanation yet.</p>
            )}
          </WbSection>
        </div>

        <div className="wb-grid">
          <WbSection title="Details">
            <dl className="wb-dl">
              {details(q).map(([label, value]) => (
                <div key={label} style={{ display: "contents" }}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </WbSection>

          <WbSection title="Flags">
            <WbTable
              caption={`Import-team flags for question ${shortId(q.id)}`}
              columns={flagColumns}
              rows={flags}
              rowKey={(row) => row.id}
              empty={<b>No flags on this question.</b>}
            />
          </WbSection>

          <WbSection title="Flag a problem">
            <FlagForm questionId={q.id} reasons={FLAG_REASONS} />
          </WbSection>
        </div>
      </div>
    </WbPage>
  );
}
