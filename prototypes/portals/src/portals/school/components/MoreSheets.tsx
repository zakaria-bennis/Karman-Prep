import { useState } from "react";
import { GlassButton } from "@/design-system/glass/GlassButton";
import { GlassSegmented } from "@/design-system/glass/GlassSegmented";
import { Sheet } from "@/design-system/components/Sheet";
import { useToast } from "@/design-system/components/Toast";
import { Icon } from "@/design-system/icons";
import { SKILLS, addDays, fmtDate } from "@/mock";
import type { SchoolClass, Staff } from "../mock";
import { addSeats, assignPractice } from "../store";
import { money, perSeat } from "../data";
import { field } from "../screens/common";

/**
 * The teacher's assign-practice sheet (a skill, a class, a due date, ten to
 * twenty questions, a week out by default) and the admin's add-seats sheet
 * (tens of seats, the price per student a year from the plan config).
 */
export function PracticeSheet({
  open,
  onClose,
  classes,
  me,
  today,
  preset,
}: {
  open: boolean;
  onClose(): void;
  classes: SchoolClass[];
  me: Staff;
  today: string;
  preset?: string;
}) {
  const toast = useToast();
  const [skill, setSkill] = useState(SKILLS[22].label);
  const [classId, setClassId] = useState(preset ?? classes[0]?.id ?? "");
  const [due, setDue] = useState(addDays(today, 7));
  const [count, setCount] = useState("10");
  const assign = () => {
    const cls = classes.find((c) => c.id === classId) ?? classes[0];
    if (!cls) return;
    const title = `${skill} practice`;
    assignPractice({
      id: `p${Date.now()}`,
      title,
      skill,
      classId: cls.id,
      due,
      questions: Number(count),
      assigned: today,
      by: me.id,
    });
    toast.push({
      title: `Assigned to ${cls.name}`,
      detail: `${title}, ${count} questions, due ${fmtDate(due)}.`,
      kind: "success",
    });
    onClose();
  };
  return (
    <Sheet open={open} onClose={onClose} title="Assign practice">
      <div className="grid gap-4">
        <label className="grid gap-1.5 text-dense font-medium">
          Skill
          <select className={field} value={skill} onChange={(e) => setSkill(e.target.value)}>
            {SKILLS.map((s) => (
              <option key={s.id} value={s.label}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-dense font-medium">
          Class
          <select className={field} value={classId} onChange={(e) => setClassId(e.target.value)}>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-dense font-medium">
          Due
          <input
            className={field}
            type="date"
            value={due}
            min={today}
            onChange={(e) => setDue(e.target.value)}
          />
        </label>
        <div className="grid gap-1.5">
          <p className="text-dense font-medium">Questions</p>
          <GlassSegmented
            label="How many questions"
            fill
            value={count}
            onChange={setCount}
            options={[
              { value: "10", label: "10" },
              { value: "15", label: "15" },
              { value: "20", label: "20" },
            ]}
          />
        </div>
        <GlassButton variant="primary" onClick={assign} className="w-full">
          Assign, due {fmtDate(due)}
        </GlassButton>
      </div>
    </Sheet>
  );
}

export function SeatsSheet({
  open,
  onClose,
  ends,
}: {
  open: boolean;
  onClose(): void;
  ends: string;
}) {
  const toast = useToast();
  const [n, setN] = useState(10);
  const add = () => {
    addSeats(n);
    toast.push({
      title: `${n} seats added`,
      detail: `${money(n * perSeat)} on the next invoice. Keys can be used right away.`,
      kind: "success",
    });
    onClose();
  };
  return (
    <Sheet open={open} onClose={onClose} title="Add seats">
      <div className="grid gap-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-body font-medium">Seats to add</p>
          <span className="inline-flex items-center gap-1">
            <button
              type="button"
              aria-label="Ten fewer"
              onClick={() => setN((v) => Math.max(10, v - 10))}
              className="grid h-11 w-11 place-items-center rounded-card border border-line"
            >
              <Icon name="minus" size={20} />
            </button>
            <span className="tabular w-12 text-center text-kpi">{n}</span>
            <button
              type="button"
              aria-label="Ten more"
              onClick={() => setN((v) => Math.min(500, v + 10))}
              className="grid h-11 w-11 place-items-center rounded-card border border-line"
            >
              <Icon name="plus" size={20} />
            </button>
          </span>
        </div>
        <p className="tabular text-dense text-muted">
          {n} seats at {money(perSeat)} per student a year is {money(n * perSeat)}, for the year to{" "}
          {fmtDate(ends, "long")}.
        </p>
        <GlassButton variant="primary" onClick={add} className="w-full">
          Add {n} seats for {money(n * perSeat)}
        </GlassButton>
      </div>
    </Sheet>
  );
}
