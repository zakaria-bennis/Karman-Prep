import { redirect } from "next/navigation";

/** The old Math skill map is now the Library's SAT Math course (2026-11-08). */
export default function Page() {
  redirect("/dashboard/student/library/math");
}
