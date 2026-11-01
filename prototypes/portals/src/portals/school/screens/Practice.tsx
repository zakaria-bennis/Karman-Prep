import { useState } from "react";
import { GlassButton } from "@/design-system/glass/GlassButton";
import { Row, List } from "@/design-system/components/Row";
import { Empty } from "@/design-system/components/Empty";
import { fmtDate } from "@/mock";
import { seeded } from "@/design-system/backgrounds/useCanvasLoop";
import { Initials } from "@/portals/tutor/shared";
import { SchoolShell } from "../shell";
import { useSchoolData } from "../data";
import type { Practice as PracticeRow } from "../mock";
import type { SchoolStudent } from "../mock-students";
import { PracticeSheet } from "../components/MoreSheets";
import { Block, Columns, Lapsed } from "./common";

/**
 * Practice: what the teacher has assigned, due and past, who did it, and one
 * way to assign more. The chosen assignment's "who did it" sits beside the
 * lists. Every due item shows its due date (rule 55).
 */
export function didIt(p: PracticeRow, s: SchoolStudent): boolean {
  const r = seeded(s.seed * 31 + p.id.length * 7919);
  for (let i = 0; i < 5; i++) r();
  return r() < (p.due < "2026-10-31" ? 0.8 : 0.5);
}
export const doneCount = (p: PracticeRow, students: SchoolStudent[]) =>
  students.filter((s) => didIt(p, s)).length;

export default function Practice() {
  const d = useSchoolData();
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState<string | null>(null);
  const soon = d.practice
    .filter((p) => p.due >= d.today)
    .sort((a, b) => a.due.localeCompare(b.due));
  const past = d.practice.filter((p) => p.due < d.today).sort((a, b) => b.due.localeCompare(a.due));
  const status = (p: PracticeRow) => {
    const list = d.studentsIn(p.classId);
    const done = doneCount(p, list);
    return done === list.length ? "everyone done" : `${done} of ${list.length} done`;
  };
  const shown = d.practice.find((p) => p.id === chosen) ?? soon[0] ?? past[0] ?? null;
  const finding = !d.practice.length
    ? d.classes.length
      ? "Nothing assigned yet. Practice goes to a class: a skill, a due date and ten to twenty questions."
      : "Practice is assigned by class. Your classes appear once the school admin adds you to one."
    : `${d.practice.length} assignments out.${soon[0] ? ` ${soon[0].title}, due ${fmtDate(soon[0].due)}: ${status(soon[0])}.` : ""}`;
  const row = (p: PracticeRow) => {
    const late = p.due < d.today && !status(p).startsWith("everyone");
    return (
      <Row
        key={p.id}
        title={`${p.title}, ${d.classById(p.classId)?.name}`}
        sub={{
          kind: "due",
          text: `Due ${fmtDate(p.due)} · ${status(p)}`,
          tone: late ? "negative" : "muted",
        }}
        trailing={`${p.questions} q`}
        selected={shown?.id === p.id}
        onPress={() => setChosen(p.id)}
      />
    );
  };
  const people = shown
    ? d
        .studentsIn(shown.classId)
        .map((s) => ({ s, done: didIt(shown, s) }))
        .sort((a, b) => Number(a.done) - Number(b.done) || a.s.name.localeCompare(b.s.name))
    : [];

  return (
    <SchoolShell
      screen="practice"
      title="Practice"
      finding={finding}
      primary={
        d.classes.length && !d.ended ? (
          <GlassButton variant="primary" onClick={() => setOpen(true)}>
            Assign practice
          </GlassButton>
        ) : null
      }
    >
      {!d.practice.length ? (
        <Empty
          title="Nothing assigned yet"
          detail="Pick a skill, a class and a due date. Students see it in their own account with the date, and their misses come back in Your Daily 10."
          action={
            d.classes.length && !d.ended ? (
              <GlassButton onClick={() => setOpen(true)}>Assign practice</GlassButton>
            ) : undefined
          }
        />
      ) : (
        <Lapsed ended={d.ended} seats={d.seats} what="practice">
          <Columns
            main={
              <>
                <Block
                  title="Due"
                  loading={d.loading}
                  error={d.error}
                  what="the assignments"
                  padded={false}
                  aside={`${soon.length}`}
                >
                  <div className="px-4 pb-1">
                    {soon.length ? (
                      <List>{soon.map(row)}</List>
                    ) : (
                      <p className="py-3 text-dense text-muted">
                        Nothing due. Assign the next set.
                      </p>
                    )}
                  </div>
                </Block>
                <Block title="Past" loading={d.loading} padded={false} aside={`${past.length}`}>
                  <div className="px-4 pb-1">
                    {past.length ? (
                      <List>{past.map(row)}</List>
                    ) : (
                      <p className="py-3 text-dense text-muted">Nothing past yet.</p>
                    )}
                  </div>
                </Block>
              </>
            }
            side={
              shown ? (
                <Block
                  title={shown.title}
                  loading={d.loading}
                  padded={false}
                  aside={`${d.classById(shown.classId)?.name} · due ${fmtDate(shown.due)}`}
                >
                  <div className="px-4 pb-1">
                    <p className="pb-1 text-dense text-muted">
                      {status(shown)}, {shown.questions} questions on {shown.skill}.
                    </p>
                    <List>
                      {people.map(({ s, done }) => (
                        <Row
                          key={s.id}
                          title={s.name}
                          leading={<Initials initial={s.initials} hue={s.hue} size={24} />}
                          sub={{
                            kind: "state",
                            text: done ? "Done" : shown.due < d.today ? "Not done" : "Not started",
                            tone: done ? "positive" : shown.due < d.today ? "negative" : "muted",
                          }}
                        />
                      ))}
                    </List>
                  </div>
                </Block>
              ) : null
            }
          />
        </Lapsed>
      )}
      <PracticeSheet
        open={open}
        onClose={() => setOpen(false)}
        classes={d.classes}
        me={d.me}
        today={d.today}
      />
    </SchoolShell>
  );
}
