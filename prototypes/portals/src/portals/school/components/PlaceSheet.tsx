import { useState } from "react";
import { GlassButton } from "@/design-system/glass/GlassButton";
import { Sheet } from "@/design-system/components/Sheet";
import { useToast } from "@/design-system/components/Toast";
import { useConfetti } from "@/design-system/components/Confetti";
import { Initials } from "@/portals/tutor/shared";
import { cn } from "@/design-system/cn";
import { Icon } from "@/design-system/icons";
import type { SchoolClass } from "../mock";
import type { SchoolStudent } from "../mock-students";
import { placeStudents } from "../store";
import { field } from "../screens/common";

/**
 * Put students with a seat and no class into a class: everyone selected by
 * default (Tesler: the common case is one move), tap a row to leave someone
 * out, one class, one action. The last student placed is the school's
 * finished moment (Peak-End), so it gets the celebration.
 */
export function PlaceSheet({
  open,
  onClose,
  students,
  classes,
  anchor,
}: {
  open: boolean;
  onClose(): void;
  students: SchoolStudent[];
  classes: SchoolClass[];
  anchor: HTMLElement | null;
}) {
  const toast = useToast();
  const confetti = useConfetti();
  const [out, setOut] = useState<Set<string>>(new Set());
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const chosen = students.filter((s) => !out.has(s.id));
  const move = () => {
    const cls = classes.find((c) => c.id === classId);
    if (!cls || !chosen.length) return;
    placeStudents(
      chosen.map((s) => s.id),
      cls.id
    );
    toast.push({
      title: `${chosen.length} students put in ${cls.name}`,
      detail: `${cls.name} now shows their levels and practice.`,
      kind: "success",
    });
    if (chosen.length === students.length && anchor) confetti.fire("level", anchor);
    onClose();
    setOut(new Set());
  };
  return (
    <Sheet open={open} onClose={onClose} title="Put students in a class">
      <div className="grid gap-4">
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
        <div className="grid gap-1">
          <p className="text-dense text-muted">
            {chosen.length} of {students.length} selected. Tap a name to leave them out.
          </p>
          <ul className="max-h-[40vh] divide-y divide-line overflow-y-auto">
            {students.map((s) => {
              const on = !out.has(s.id);
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    onClick={() =>
                      setOut((prev) => {
                        const next = new Set(prev);
                        if (next.has(s.id)) next.delete(s.id);
                        else next.add(s.id);
                        return next;
                      })
                    }
                    className={cn(
                      "flex min-h-12 w-full items-center gap-3 py-2 text-left",
                      !on && "text-muted"
                    )}
                  >
                    <Initials initial={s.initials} hue={s.hue} size={24} />
                    <span className="min-w-0 flex-1 truncate text-body font-medium">{s.name}</span>
                    <span className="tabular text-dense text-muted">
                      {s.questionsWeek} q this week
                    </span>
                    <span
                      aria-hidden="true"
                      className={cn(
                        "grid h-6 w-6 place-items-center rounded-full border",
                        on ? "border-accent bg-accent text-accent-ink" : "border-border"
                      )}
                    >
                      {on ? <Icon name="check" size={20} /> : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
        <GlassButton variant="primary" onClick={move} className="w-full" disabled={!chosen.length}>
          Put {chosen.length} in {classes.find((c) => c.id === classId)?.name ?? "the class"}
        </GlassButton>
      </div>
    </Sheet>
  );
}
