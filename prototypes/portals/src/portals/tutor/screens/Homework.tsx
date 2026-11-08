import { useState, type ReactNode } from "react";
import { GlassButton } from "@/design-system/glass/GlassButton";
import { GlassSegmented } from "@/design-system/glass/GlassSegmented";
import { Row, List } from "@/design-system/components/Row";
import { Sheet } from "@/design-system/components/Sheet";
import { Empty } from "@/design-system/components/Empty";
import { useToast } from "@/design-system/components/Toast";
import { SKILLS, TODAY, addDays, fmtDate } from "@/mock";
import { TutorShell } from "../shell";
import { useTutorData } from "../data";
import { useHashParam } from "../nav";
import { tutorStudentById } from "../mock";
import { ASSIGNMENTS, doneCount, type Assignment } from "../mock-work";
import { addAssignment, useStore } from "../store";
import { Chips } from "../components/Chips";
import { Initials } from "../components/Initials";
import { Block, Columns } from "./common";

/**
 * Homework: what is out, who did it, and one way to assign more. On desktop
 * the chosen assignment's "who did it" sits beside the lists; on phones it is
 * a sheet. The assign sheet asks four things (what, who, when, how many); who
 * is a row of chips (Fitts: thumb-sized), the due date defaults to a week out.
 */
const field =
  "h-11 w-full rounded-control border border-border/70 bg-surface px-3 text-body text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

export default function Homework() {
  const data = useTutorData();
  const toast = useToast();
  const { assigned } = useStore();
  const preset = useHashParam("id");
  const [open, setOpen] = useState(false);
  const [who, setWho] = useState<Assignment | null>(null);
  const [title, setTitle] = useState("");
  const [skill, setSkill] = useState(SKILLS[22].label);
  const [to, setTo] = useState<string[]>(preset ? [preset] : []);
  const [due, setDue] = useState(addDays(TODAY, 7));
  const [count, setCount] = useState("10");
  const all = data.empty || data.firstDay ? [] : ASSIGNMENTS;
  const soon = all.filter((a) => a.due >= TODAY).sort((a, b) => a.due.localeCompare(b.due));
  const past = all.filter((a) => a.due < TODAY).sort((a, b) => b.due.localeCompare(a.due));
  const options = [
    ...data.cohorts.map((c) => ({ id: c.id, label: c.name })),
    ...data.privates.map((s) => ({ id: s.id, label: s.name, initial: s.initials, hue: s.hue })),
  ];
  const nameOf = (id: string) =>
    options.find((o) => o.id === id)?.label ?? tutorStudentById(id)?.name ?? id;
  const assign = () => {
    const name = title.trim() || `${skill} practice`;
    addAssignment({ id: `a${Date.now()}`, title: name, to, due, questions: Number(count) });
    toast.push({
      title: `Assigned to ${to.map(nameOf).join(", ")}`,
      detail: `${name}, ${count} questions, due ${fmtDate(due)}.`,
      kind: "success",
    });
    setOpen(false);
    setTitle("");
    setTo([]);
  };
  const finding = data.empty
    ? "Nothing assigned. Homework can go to a cohort or to one student."
    : data.firstDay
      ? `Nothing assigned yet. ${data.students[0].name}'s first set comes after the diagnostic.`
      : `${all.length} assignments out.${soon[0] ? ` ${soon[0].title}, due ${fmtDate(soon[0].due)}: ${status(soon[0])}.` : ""}`;

  const row = (a: Assignment, selected: boolean) => (
    <Row
      key={a.id}
      title={a.title}
      sub={{
        kind: "due",
        text: `${nameOf(a.to.id)} · due ${fmtDate(a.due)}, ${status(a)}`,
        tone: a.due < TODAY && doneCount(a) < a.results.length ? "negative" : "muted",
      }}
      trailing={`${a.questions} q`}
      selected={selected}
      onPress={() => setWho(a)}
    />
  );
  const people = (a: Assignment) => (
    <List>
      {a.results.map((r) => {
        const s = tutorStudentById(r.studentId);
        if (!s) return null;
        return (
          <Row
            key={r.studentId}
            title={s.name}
            sub={{
              kind: "state",
              text: r.done
                ? `Done, ${r.right} of ${a.questions} right`
                : r.answered
                  ? `${r.answered} of ${a.questions} answered`
                  : "Not started",
              tone: r.done ? "positive" : "muted",
            }}
            leading={<Initials initial={s.initials} hue={s.hue} size={24} />}
          />
        );
      })}
    </List>
  );

  return (
    <TutorShell
      screen="homework"
      title="Homework"
      finding={finding}
      primary={
        data.empty ? null : (
          <GlassButton variant="primary" onClick={() => setOpen(true)}>
            Assign practice
          </GlassButton>
        )
      }
    >
      {({ desktop }) => {
        const shown = desktop ? (who ?? soon[0] ?? past[0] ?? null) : null;
        const lists: ReactNode = (
          <>
            <Block
              title="Due"
              loading={data.loading}
              error={data.error}
              what="the homework"
              onRetry={() =>
                toast.push({
                  title: "Still can't load homework",
                  detail: "Last updated 9:14 am.",
                  kind: "error",
                })
              }
              padded={false}
              aside={`${soon.length + assigned.length}`}
            >
              <div className="px-4 pb-1">
                <List>
                  {assigned.map((a) => (
                    <Row
                      key={a.id}
                      title={a.title}
                      sub={{
                        kind: "due",
                        text: `${a.to.map(nameOf).join(", ")} · due ${fmtDate(a.due)}, not started`,
                      }}
                      trailing={`${a.questions} q`}
                    />
                  ))}
                  {soon.map((a) => row(a, shown?.id === a.id))}
                </List>
              </div>
            </Block>
            <Block
              title="Done or past"
              loading={data.loading}
              padded={false}
              aside={`${past.length}`}
            >
              <div className="px-4 pb-1">
                <List>{past.map((a) => row(a, shown?.id === a.id))}</List>
              </div>
            </Block>
          </>
        );
        return (
          <>
            {!all.length && !assigned.length ? (
              <Empty
                title="Nothing assigned"
                detail="Assign practice by skill to a cohort or one student. Every set shows who did it and how many they got right."
              />
            ) : desktop ? (
              <Columns
                main={lists}
                side={
                  shown ? (
                    <Block
                      title={`Who did it: ${shown.title}`}
                      loading={data.loading}
                      padded={false}
                      aside={`${doneCount(shown)} of ${shown.results.length} done`}
                    >
                      <div className="px-4 pb-1">{people(shown)}</div>
                    </Block>
                  ) : null
                }
              />
            ) : (
              <div className="grid gap-5">{lists}</div>
            )}
            <Sheet
              open={!desktop && !!who}
              onClose={() => setWho(null)}
              title={who?.title ?? "Who did it"}
            >
              {who ? people(who) : null}
            </Sheet>
            <Sheet open={open} onClose={() => setOpen(false)} title="Assign practice">
              <div className="grid gap-4">
                <label className="grid gap-1.5 text-dense font-medium">
                  Skill
                  <select
                    value={skill}
                    onChange={(e) => setSkill(e.target.value)}
                    className={field}
                  >
                    {SKILLS.map((s) => (
                      <option key={s.id} value={s.label}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1.5 text-dense font-medium">
                  Title
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={`${skill} practice`}
                    className={field}
                  />
                </label>
                <div className="grid gap-1.5 text-dense font-medium">
                  To
                  <Chips label="Assign to" options={options} value={to} onChange={setTo} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="grid gap-1.5 text-dense font-medium">
                    Due
                    <input
                      type="date"
                      value={due}
                      min={TODAY}
                      onChange={(e) => setDue(e.target.value)}
                      className={field}
                    />
                  </label>
                  <div className="grid gap-1.5 text-dense font-medium">
                    Questions
                    <GlassSegmented
                      label="Questions"
                      options={["10", "15", "20"].map((v) => ({ value: v, label: v }))}
                      value={count}
                      onChange={setCount}
                      fill
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <GlassButton variant="primary" onClick={assign} disabled={!to.length}>
                    Assign
                  </GlassButton>
                </div>
              </div>
            </Sheet>
          </>
        );
      }}
    </TutorShell>
  );
}

const status = (a: Assignment) => {
  const r = a.results[0];
  return a.results.length > 1
    ? `${doneCount(a)} of ${a.results.length} done`
    : r.done
      ? `${r.right} of ${a.questions} right`
      : r.answered
        ? `${r.answered} of ${a.questions} answered`
        : "not started";
};
