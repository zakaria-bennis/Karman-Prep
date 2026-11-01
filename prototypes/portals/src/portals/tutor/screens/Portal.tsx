import { Suspense, lazy, useMemo, type ComponentType } from "react";
import { Skeleton } from "@/design-system/components/Skeleton";
import { useHashParam } from "../nav";

/**
 * The first registered route. The gallery falls back to a portal's first
 * route when the role switch does not match the screen's roles (its default
 * role is student), so this one reads the `screen` query itself and shows
 * the requested screen. With role=tutor the gallery resolves screens directly.
 */
const modules = import.meta.glob("./*.tsx") as Record<
  string,
  () => Promise<{ default: ComponentType }>
>;
const FILES: Record<string, string> = {
  today: "Today",
  students: "Students",
  student: "Student",
  cohorts: "Cohorts",
  class: "Class",
  homework: "Homework",
  schedule: "Schedule",
  guarantee: "Guarantee",
  queue: "Queue",
  earnings: "Earnings",
  update: "Update",
  notes: "Notes",
};

export default function Portal() {
  const id = useHashParam("screen") ?? "today";
  const file = FILES[id] ?? "Today";
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
