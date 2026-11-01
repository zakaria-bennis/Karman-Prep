import { useState } from "react";
import { Panel } from "@/design-system/glass/Panel";
import { DataTable } from "@/design-system/components/DataTable";
import { Empty } from "@/design-system/components/Empty";
import { formatClock } from "@/design-system/components/Timer";
import { FIELDS, readRecords, clearRecords, type AnswerRecord } from "./telemetry";
import { TextLink } from "./Shell";

/*
 * "What we save": the data model behind every answer, as the founder can see
 * it. The field list names each field and why it is kept; the table shows
 * the answers this browser recorded in the demo, newest first.
 */
type Line = {
  id: string;
  question: string;
  mode: string;
  position: number;
  firstTry: string;
  time: string;
  help: string;
  calculator: string;
  explanation: string;
  changed: number;
  device: string;
};

const yes = (b: boolean) => (b ? "Yes" : "No");
const line = (r: AnswerRecord): Line => ({
  id: r.id,
  question: r.questionVersion,
  mode: r.mode,
  position: r.position,
  firstTry: yes(r.firstTry),
  time: formatClock(Math.round(r.timeMs / 1000)),
  help: yes(r.helpUsed),
  calculator: yes(r.calculatorUsed),
  explanation: yes(r.explanationUsed),
  changed: r.changedAnswer,
  device: r.device,
});

export function WhatWeSave() {
  const [records, setRecords] = useState(() => readRecords().slice(-8).reverse());
  return (
    <Panel as="section" aria-label="What we save" className="grid gap-4 p-4">
      <div>
        <h2 className="text-section">What we save</h2>
        <p className="text-dense text-muted">
          Every answer records these fields. They make the predicted score more accurate.
        </p>
      </div>
      <dl className="grid gap-y-2">
        {FIELDS.map((f) => (
          <div key={f.key} className="grid grid-cols-[150px_minmax(0,1fr)] gap-2 text-dense">
            <dt className="font-medium">{f.label}</dt>
            <dd className="text-muted">{f.why}</dd>
          </div>
        ))}
      </dl>
      <div className="grid gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-dense font-semibold">Answers recorded in this browser</h3>
          {records.length ? (
            <TextLink
              className="text-dense"
              onClick={() => {
                clearRecords();
                setRecords([]);
              }}
            >
              Clear
            </TextLink>
          ) : null}
        </div>
        {records.length ? (
          <DataTable
            rows={records.map(line)}
            rowKey="id"
            caption="Recorded answers, newest first"
            columns={[
              { key: "question", label: "Question version", sortable: false },
              { key: "mode", label: "Mode", sortable: false },
              { key: "position", label: "Position", numeric: true, sortable: false },
              { key: "firstTry", label: "First try", sortable: false },
              { key: "time", label: "Time", sortable: false },
              { key: "help", label: "Help", sortable: false },
              { key: "calculator", label: "Calculator", sortable: false },
              { key: "explanation", label: "Explanation", sortable: false },
              { key: "changed", label: "Changed", numeric: true, sortable: false },
              { key: "device", label: "Device", sortable: false },
            ]}
          />
        ) : (
          <Empty
            title="Nothing recorded yet"
            detail="Answer a question anywhere in the portal and the row appears here."
          />
        )}
      </div>
    </Panel>
  );
}
