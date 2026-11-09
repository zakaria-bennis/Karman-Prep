import { redirect } from "next/navigation";

/** The old Reading and Writing skill map is now the Library's course (2026-11-08). */
export default function Page() {
  redirect("/dashboard/student/library/reading-writing");
}
