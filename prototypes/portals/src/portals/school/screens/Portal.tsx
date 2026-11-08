import { Suspense, lazy, useMemo, type ComponentType } from "react";
import { Skeleton } from "@/design-system/components/Skeleton";
import { useHashParam, useRole } from "../nav";

/**
 * The first registered route. The gallery falls back to a portal's first
 * route when the role switch does not match the screen's roles (its default
 * role is student), so this one reads the `screen` query itself and shows
 * the requested screen. A teacher asking for an admin screen gets Classes.
 */
const modules = import.meta.glob("./*.tsx") as Record<
  string,
  () => Promise<{ default: ComponentType }>
>;
const FILES: Record<string, string> = {
  overview: "Overview",
  classes: "Classes",
  class: "Class",
  students: "Students",
  student: "Student",
  practice: "Practice",
  keys: "Keys",
  teachers: "Teachers",
  seats: "Seats",
};
const ADMIN_ONLY = new Set(["overview", "keys", "teachers", "seats"]);

export default function Portal() {
  const role = useRole();
  const asked = useHashParam("screen") ?? (role === "teacher" ? "classes" : "overview");
  const id = role === "teacher" && ADMIN_ONLY.has(asked) ? "classes" : asked;
  const file = FILES[id] ?? (role === "teacher" ? "Classes" : "Overview");
  const Comp = useMemo(() => lazy(modules[`./${file}.tsx`]), [file]);
  return (
    <Suspense
      fallback={
        <div className="p-5">
          <Skeleton.Text lines={4} />
        </div>
      }
    >
      <Comp />
    </Suspense>
  );
}
