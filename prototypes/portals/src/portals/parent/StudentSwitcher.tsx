import { GlassSegmented } from "@/design-system/glass/GlassSegmented";
import { useParent } from "./view";

/** The student switcher: one glass segment per student, the first open by default (Jakob: a segmented control, as in Screen Time’s family view). */
export function StudentSwitcher({ fill }: { fill?: boolean }) {
  const v = useParent();
  return (
    <GlassSegmented
      label="Student"
      fill={fill}
      value={v.student.id}
      onChange={v.select}
      options={v.students.map((s) => ({ value: s.id, label: s.name }))}
    />
  );
}
