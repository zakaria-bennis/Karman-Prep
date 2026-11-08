import { useRef, useState } from "react";
import { GlassButton } from "@/design-system/glass/GlassButton";
import { Row, List } from "@/design-system/components/Row";
import { useToast } from "@/design-system/components/Toast";
import { Initials } from "@/portals/tutor/shared";
import { SCHOOL, fmtDate } from "@/mock";
import { SchoolShell } from "../shell";
import { useSchoolData } from "../data";
import { goScreen, hrefFor } from "../nav";
import { KeysBlock, LedgerBlock, PilotBlock, TeachersBlock } from "../components/OverviewBlocks";
import { RankBars, type RankItem } from "../components/RankBars";
import { SetupSteps } from "../components/SetupSteps";
import { Photo } from "../components/Photo";
import { ClassSheet } from "../components/Sheets";
import { PlaceSheet } from "../components/PlaceSheet";
import { Block, Columns, Kpis, Lapsed, fullDate, listOf, pct } from "./common";

/**
 * Overview, the admin's home. The question: is the school using its seats,
 * and what needs me? The biggest block is the seat ledger (the licence as
 * seats); the finding names the students a class would help; the one action
 * does that. On the first morning the screen is the setup, 120 free seats.
 */
export default function Overview() {
  const d = useSchoolData();
  const toast = useToast();
  const anchor = useRef<HTMLDivElement>(null);
  const [sheet, setSheet] = useState<null | "class" | "place">(null);
  const inClass = d.students.filter((s) => s.classId);
  const per = (list: typeof d.students) =>
    list.length ? Math.round(list.reduce((a, s) => a + s.questionsWeek, 0) / list.length) : 0;
  const keysInUse = d.keys.filter((k) => !k.revoked);
  const yearQuestions = d.students.reduce((a, s) => a + s.questionsTotal, 0);
  const scored = d.students.filter((s) => s.predicted).length;
  const ranked = d.classes
    .map((c) => ({ c, value: per(d.studentsIn(c.id)) }))
    .sort((a, b) => b.value - a.value);
  const tied = ranked.length > 1 && ranked[0].value === ranked[1].value;
  const topLine = !ranked.length
    ? ""
    : tied
      ? `${ranked[0].c.name} and ${ranked[1].c.name} both practised ${ranked[0].value} questions a student.`
      : `${ranked[0].c.name} practised most, ${ranked[0].value} questions a student.`;

  const finding = d.firstDay
    ? `You set ${SCHOOL.name} up this morning: ${d.licence.seats} seats in the founding pilot, free until ${fullDate(d.licence.ends)}. Add a class first; students join with its key.`
    : d.setup
      ? `Classes and keys are ready. No student has used a key yet; the ${listOf(keysInUse.map((k) => k.label))} ${keysInUse.length === 1 ? "key was" : "keys were"} issued ${fmtDate(keysInUse[0]?.issued ?? d.today)}.`
      : d.ended
        ? `The year ended ${fmtDate(d.licence.ends)} with ${d.students.length} of ${d.seats} seats used and ${yearQuestions.toLocaleString("en-US")} questions answered. The renewal quote went out ${fmtDate(d.licence.renewalQuote)}.`
        : `${d.week.active} of ${d.students.length} students practised this week. ${topLine} The ${d.unassigned.length} with a seat and no class answered ${per(d.unassigned)} questions each; those in a class, ${per(inClass)}.`;
  const primary = d.firstDay ? (
    <GlassButton variant="primary" onClick={() => setSheet("class")}>
      Add a class
    </GlassButton>
  ) : d.setup ? (
    <GlassButton variant="primary" onClick={() => goScreen("keys")}>
      Share the keys
    </GlassButton>
  ) : d.ended ? (
    <GlassButton variant="primary" onClick={() => goScreen("seats")}>
      Renew {d.seats} seats
    </GlassButton>
  ) : d.unassigned.length ? (
    <GlassButton variant="primary" onClick={() => setSheet("place")}>
      Put {d.unassigned.length} students in a class
    </GlassButton>
  ) : null;

  // Adding a class issues its seat key with it, so the two are one step.
  const steps = [
    {
      id: "class",
      label: "Add a class and its seat key",
      done: d.classes.length > 0 && d.keys.length > 0,
      action: d.classes.length
        ? { label: "Issue", href: hrefFor("keys") }
        : { label: "Add", onClick: () => setSheet("class") },
    },
    {
      id: "teacher",
      label: "Add a teacher",
      done: d.teachers.length > 0,
      action: { label: "Add", href: hrefFor("teachers") },
    },
    {
      id: "students",
      label: "Students join with the key",
      detail: d.keys.length ? "Waiting on the first sign-in" : undefined,
      done: d.students.length > 0,
    },
  ];
  const classRows: RankItem[] = [
    ...d.classes.map((c) => {
      const list = d.studentsIn(c.id);
      return {
        id: c.id,
        label: c.name,
        value: per(list),
        valueLabel: `${per(list)} q`,
        highlight: false,
      };
    }),
    ...(d.unassigned.length
      ? [
          {
            id: "none",
            label: "No class yet",
            value: per(d.unassigned),
            valueLabel: `${per(d.unassigned)} q`,
            tone: "negative" as const,
          },
        ]
      : []),
  ].sort((a, b) => b.value - a.value);
  // The leader carries the accent; on a tie, no row does (the finding names both).
  if (classRows[0] && classRows[0].id !== "none" && !tied) classRows[0].highlight = true;
  const idle = d.students
    .filter((s) => s.questionsWeek === 0)
    .sort((a, b) => (a.lastActive ?? "").localeCompare(b.lastActive ?? ""));

  return (
    <SchoolShell screen="overview" title="Overview" finding={finding} primary={primary}>
      <div ref={anchor}>
        {d.firstDay || d.setup ? (
          <Columns
            main={
              <>
                <Block
                  title={`Set up ${SCHOOL.name}`}
                  loading={d.loading}
                  error={d.error}
                  what="the setup"
                >
                  <SetupSteps steps={steps} className="pt-1" />
                </Block>
                {/* The setup mornings only: the room the seats are for. Under the steps, so the steps lead. */}
                <Photo
                  id="p-school-class"
                  alt="A high-school classroom in morning light: students work on laptops at their desks while a teacher leans in to help one of them."
                  sizes="(min-width: 1100px) 640px, (min-width: 700px) calc(100vw - 112px), calc(100vw - 32px)"
                  lazy
                />
              </>
            }
            side={
              <>
                <LedgerBlock d={d} />
                <PilotBlock d={d} />
              </>
            }
          />
        ) : (
          <Columns
            main={
              <>
                <Lapsed
                  ended={d.ended}
                  seats={d.seats}
                  licence={d.licence}
                  what="the school's practice"
                >
                  <Kpis
                    loading={d.loading}
                    items={
                      d.ended
                        ? [
                            {
                              label: "Students this year",
                              value: String(d.students.length),
                              unit: `of ${d.seats} seats`,
                              lead: true,
                            },
                            {
                              label: "Questions answered",
                              value: yearQuestions.toLocaleString("en-US"),
                            },
                            {
                              label: "With a predicted score",
                              value: String(scored),
                              unit: "students",
                            },
                          ]
                        : [
                            {
                              label: "Practised this week",
                              value: String(d.week.active),
                              unit: `of ${d.students.length}`,
                              lead: true,
                            },
                            {
                              label: "Questions answered",
                              value: d.week.questions.toLocaleString("en-US"),
                              delta: { text: "this week", tone: "muted" },
                            },
                            {
                              label: "Your Daily 10 done",
                              value: pct(d.week.daily10Done, d.week.daily10Slots),
                              delta: {
                                text: `${d.week.daily10Done} of ${d.week.daily10Slots} school days`,
                                tone: "muted",
                              },
                            },
                          ]
                    }
                  />
                </Lapsed>
                <Block
                  title={d.ended ? "Classes" : "Questions a student this week, by class"}
                  loading={d.loading}
                  error={d.error}
                  what="the classes"
                  onRetry={() =>
                    toast.push({
                      title: "Still can't load the classes",
                      detail: "Last updated 9:14 am.",
                      kind: "error",
                    })
                  }
                >
                  <RankBars
                    items={classRows}
                    className="pt-2"
                    href={(id) => (id === "none" ? undefined : hrefFor("class", { id }))}
                    onPress={() => setSheet("place")}
                  />
                </Block>
                {!d.ended && d.students.length ? (
                  <Block
                    title="No practice this week"
                    loading={d.loading}
                    padded={false}
                    aside={`${idle.length} of ${d.students.length}`}
                  >
                    <div className="px-4 pb-2">
                      {idle.length ? (
                        <List
                          total={idle.length > 4 ? `${idle.length} students` : undefined}
                          viewAll={
                            idle.length > 4 ? (
                              <a
                                href={hrefFor("students", { tab: "idle" })}
                                className="inline-flex min-h-tap items-center font-semibold text-accent"
                              >
                                View all
                              </a>
                            ) : undefined
                          }
                        >
                          {idle.slice(0, 4).map((s) => (
                            <Row
                              key={s.id}
                              title={s.name}
                              leading={<Initials initial={s.initials} hue={s.hue} size={24} />}
                              sub={{
                                kind: "state",
                                text: s.lastActive
                                  ? `${d.classById(s.classId)?.name ?? "No class"} · last active ${fmtDate(s.lastActive)}`
                                  : `${d.classById(s.classId)?.name ?? "No class"} · never practised`,
                              }}
                              href={hrefFor("student", { id: s.id })}
                            />
                          ))}
                        </List>
                      ) : (
                        <p className="py-3 text-dense text-muted">Everyone practised this week.</p>
                      )}
                    </div>
                  </Block>
                ) : null}
              </>
            }
            side={
              <>
                <LedgerBlock d={d} />
                <KeysBlock d={d} keys={keysInUse} />
                <TeachersBlock d={d} />
              </>
            }
          />
        )}
      </div>
      <ClassSheet
        open={sheet === "class"}
        onClose={() => setSheet(null)}
        teachers={d.teachers}
        me={d.me}
        today={d.today}
      />
      <PlaceSheet
        open={sheet === "place"}
        onClose={() => setSheet(null)}
        students={d.unassigned}
        classes={d.classes}
        anchor={anchor.current}
      />
    </SchoolShell>
  );
}
