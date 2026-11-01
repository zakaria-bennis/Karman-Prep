import { useState } from "react";
import { GlassButton } from "@/design-system/glass/GlassButton";
import { Row, List } from "@/design-system/components/Row";
import { Empty } from "@/design-system/components/Empty";
import { Pill } from "@/design-system/components/Pill";
import { fmtDate } from "@/mock";
import { Initials } from "@/portals/tutor/shared";
import { SchoolShell } from "../shell";
import { useSchoolData } from "../data";
import { goScreen } from "../nav";
import { InviteSheet } from "../components/InviteSheet";
import { Block, Columns, Lapsed } from "./common";

/**
 * Teachers and admins. The question: who can see what? One row per person
 * with their classes; an invitation's state is the second line until they
 * sign in. The one action adds a teacher.
 */
export default function Teachers() {
  const d = useSchoolData();
  const [open, setOpen] = useState(false);
  const pending = d.staff.filter((s) => !s.signedIn);
  const admins = d.staff.filter((s) => s.role === "admin");
  const unled = d.classes.filter(
    (c) => !d.staff.some((s) => s.id === c.teacher && s.role === "teacher")
  );
  const finding = !d.teachers.length
    ? `Only you so far. A teacher sees their own classes and every student's levels; another admin sees everything.`
    : pending.length
      ? `${d.teachers.length} teachers. ${pending.map((p) => p.name).join(" and ")} ${pending.length === 1 ? "has" : "have"} not signed in yet; the invitation was sent ${fmtDate(pending[0].invited ?? d.today)}.`
      : `${d.teachers.length} teachers, all signed in.`;
  const row = (t: (typeof d.staff)[number]) => {
    const classes = d.classes.filter((c) => c.teacher === t.id);
    const students = classes.reduce((a, c) => a + d.studentsIn(c.id).length, 0);
    return (
      <Row
        key={t.id}
        title={t.name}
        leading={<Initials initial={t.initials} hue={t.hue} size={24} />}
        sub={
          t.signedIn
            ? undefined
            : { kind: "state", text: `Invited ${fmtDate(t.invited ?? d.today)}, not signed in yet` }
        }
        trailing={
          t.role === "admin" ? (
            <Pill>Admin</Pill>
          ) : classes.length ? (
            `${classes.map((c) => c.name).join(", ")} · ${students}`
          ) : (
            "No class yet"
          )
        }
        onPress={classes[0] ? () => goScreen("class", { id: classes[0].id }) : undefined}
      />
    );
  };

  return (
    <SchoolShell
      screen="teachers"
      title="Teachers"
      finding={finding}
      primary={
        d.ended ? null : (
          <GlassButton variant="primary" onClick={() => setOpen(true)}>
            Add a teacher
          </GlassButton>
        )
      }
    >
      {!d.teachers.length ? (
        <Empty
          title="No teachers yet"
          detail="A teacher gets an email, signs in with it, and sees their classes. Until then, classes can be yours."
        />
      ) : (
        <Columns
          main={
            <Lapsed ended={d.ended} seats={d.seats} licence={d.licence} what="every teacher's view">
              <Block
                title="Teachers"
                loading={d.loading}
                error={d.error}
                what="the teachers"
                padded={false}
                aside={`${d.teachers.length}`}
              >
                <div className="px-4 pb-1">
                  <List>{d.teachers.map(row)}</List>
                </div>
              </Block>
            </Lapsed>
          }
          side={
            <>
              <Block
                title="School admins"
                loading={d.loading}
                padded={false}
                aside={`${admins.length}`}
              >
                <div className="px-4 pb-1">
                  <List>{admins.map(row)}</List>
                </div>
                <p className="px-4 pb-3 text-dense text-muted">
                  An admin buys seats, issues keys and adds people. Teachers see their classes only.
                </p>
              </Block>
              <Block
                title="Classes with no teacher"
                loading={d.loading}
                padded={false}
                aside={`${unled.length} of ${d.classes.length}`}
              >
                <div className="px-4 pb-1">
                  {unled.length ? (
                    <List>
                      {unled.map((c) => (
                        <Row
                          key={c.id}
                          title={c.name}
                          trailing={`${d.studentsIn(c.id).length} students`}
                          onPress={() => goScreen("class", { id: c.id })}
                        />
                      ))}
                    </List>
                  ) : (
                    <p className="py-3 text-dense text-muted">Every class has a teacher.</p>
                  )}
                </div>
              </Block>
            </>
          }
        />
      )}
      <InviteSheet open={open} onClose={() => setOpen(false)} pending={pending} today={d.today} />
    </SchoolShell>
  );
}
