import { useState } from "react";
import { Panel } from "@/design-system/glass/Panel";
import { GlassButton } from "@/design-system/glass/GlassButton";
import { Row, List } from "@/design-system/components/Row";
import { LevelBar, LevelMark, BANDS } from "@/design-system/marks";
import { DOMAINS, TODAY, byBand, fmtDate } from "@/mock";
import { ME, notesFor, cohortById, type TutorStudent } from "../mock";
import { tutorLevelsFor } from "../mock-tests";
import { assignmentsFor, requirementsFor } from "../mock-work";
import { addNote, useStore } from "../store";
import { RequirementRow } from "../components/Requirement";
import { Timeline } from "../components/Timeline";
import { Block, Columns, Grid2, PlanGate } from "./common";
import { useTutorData } from "../data";
import { useToast } from "@/design-system/components/Toast";
import { goScreen } from "../nav";

/** The student view's other tabs: levels, guarantee, homework and notes. */
export function Levels({ s }: { s: TutorStudent }) {
  const levels = tutorLevelsFor(s.id);
  const counts = byBand(levels);
  return (
    <div className="grid gap-5">
      <p className="text-dense text-muted">
        {counts
          .slice()
          .reverse()
          .map((c) => `${c.count} ${BANDS[c.band]}`)
          .join(" · ")}
      </p>
      <Grid2>
        {DOMAINS.map((d) => (
          <Panel key={d} as="section" className="px-4 py-3">
            <h2 className="text-section">{d}</h2>
            <ul className="mt-1 divide-y divide-line">
              {levels
                .filter((l) => l.domain === d)
                .map((l) => (
                  <li key={l.id} className="grid gap-1 py-2">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0 truncate text-dense" title={l.label}>
                        {l.label}
                      </span>
                      <span className="tabular shrink-0 text-dense">
                        {l.now > 0 ? l.now : <span className="text-muted">-</span>}
                        {l.now !== l.was ? (
                          <span className={l.now > l.was ? "text-positive" : "text-negative"}>
                            {" "}
                            {l.now > l.was ? `+${l.now - l.was}` : `${l.now - l.was}`} today
                          </span>
                        ) : null}
                      </span>
                    </div>
                    <LevelBar value={l.now} was={l.was} size="sm" />
                  </li>
                ))}
            </ul>
          </Panel>
        ))}
      </Grid2>
    </div>
  );
}

export function GuaranteeTab({ s }: { s: TutorStudent }) {
  const rows = requirementsFor(s.id);
  const cohort = s.cohort ? cohortById(s.cohort) : null;
  return (
    <PlanGate plan={s.plan} bundle="guarantee">
      <Panel as="section" className="px-4 py-3">
        <h2 className="text-section">Guarantee requirements</h2>
        {rows.length ? (
          <div className="divide-y divide-line">
            {rows.map((r) => (
              <RequirementRow key={r.id} r={r} />
            ))}
          </div>
        ) : cohort && cohort.classesHeld === 0 ? (
          <p className="py-3 text-dense text-muted">
            Tracking starts with the first class on {fmtDate(cohort.start)}.
          </p>
        ) : (
          <div className="divide-y divide-line">
            {[
              "Every session attended",
              "Full-length tests taken",
              "Official SAT within 30 days of the last session",
            ].map((label) => (
              <div
                key={label}
                className="flex items-baseline justify-between gap-3 py-3 text-dense"
              >
                <span>{label}</span>
                <span className="text-muted">-</span>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </PlanGate>
  );
}

export function HomeworkTab({ s }: { s: TutorStudent }) {
  const { assigned } = useStore();
  const own = assignmentsFor(s.id);
  const added = assigned.filter(
    (a) => a.to.includes(s.id) || (s.cohort && a.to.includes(s.cohort))
  );
  return (
    <Panel as="section" className="px-4 py-2">
      <div className="flex items-baseline justify-between gap-3 pb-1 pt-1">
        <h2 className="text-section">Homework</h2>
        <button
          type="button"
          onClick={() => goScreen("homework", { id: s.id })}
          className="min-h-tap text-dense font-semibold text-accent"
        >
          Assign practice
        </button>
      </div>
      {own.length || added.length ? (
        <List>
          {added.map((a) => (
            <Row
              key={a.id}
              title={a.title}
              sub={{ kind: "due", text: `Due ${fmtDate(a.due)}, not started` }}
              trailing={`${a.questions} q`}
            />
          ))}
          {own.map((a) => {
            const r = a.results.find((x) => x.studentId === s.id)!;
            return (
              <Row
                key={a.id}
                title={a.title}
                sub={{
                  kind: "due",
                  text: `Due ${fmtDate(a.due)}, ${r.done ? `${r.right} of ${a.questions} right` : r.answered ? `${r.answered} of ${a.questions} answered` : "not started"}`,
                  tone: !r.done && a.due < TODAY ? "negative" : "muted",
                }}
                trailing={`${a.questions} q`}
              />
            );
          })}
        </List>
      ) : (
        <p className="py-3 text-dense text-muted">Nothing assigned yet.</p>
      )}
    </Panel>
  );
}

export function NotesTab({ s }: { s: TutorStudent }) {
  const { notes } = useStore();
  const data = useTutorData();
  const toast = useToast();
  const [text, setText] = useState("");
  const [saved, setSaved] = useState(false);
  const mine = notesFor(s.id);
  const added = notes[s.id] ?? [];
  const entries = [
    ...added.map((n) => ({
      id: n.id,
      date: n.date,
      title: "Note",
      text: n.text,
      initial: ME.initials,
      hue: ME.hue,
    })),
    ...mine.map((n) => ({
      id: n.id,
      date: n.date,
      title: `Session ${n.session}`,
      text: n.text,
      initial: ME.initials,
      hue: ME.hue,
      mark: n.sent ? `Update sent to ${s.parent.name}` : undefined,
    })),
  ];
  const save = () => {
    if (!text.trim()) return;
    addNote(s.id, text.trim(), TODAY);
    setText("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };
  return (
    <Columns
      main={
        <Block
          title="Notes"
          loading={data.loading}
          error={data.error}
          what="the notes"
          onRetry={() =>
            toast.push({
              title: "Still can't load the notes",
              detail: "Last updated 9:14 am.",
              kind: "error",
            })
          }
        >
          <Timeline
            entries={entries}
            emptyText="No notes yet. Write the first one after the first session."
          />
        </Block>
      }
      side={
        <Panel as="section" className="grid content-start gap-3 px-4 py-3">
          <h2 className="text-section">Add a note</h2>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            aria-label="New note"
            placeholder={`What ${s.name} worked on, what moved, what comes next`}
            className="w-full resize-y rounded-control border border-border/70 bg-surface px-3 py-2 text-body leading-[22px] text-text placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          />
          <div className="flex items-center justify-between gap-3">
            <span className="text-dense text-muted" aria-live="polite">
              {saved ? "Saved" : "Only tutors and the admin see notes."}
            </span>
            <GlassButton onClick={save} disabled={!text.trim()}>
              Save note
            </GlassButton>
          </div>
        </Panel>
      }
    />
  );
}

export const LevelLegend = () => (
  <p className="flex flex-wrap gap-x-4 gap-y-1 text-small text-muted">
    {([1, 2, 3, 4] as const).map((b) => (
      <span key={b} className="inline-flex items-center gap-1">
        <LevelMark level={b} size={20} /> {BANDS[b]}
      </span>
    ))}
  </p>
);
