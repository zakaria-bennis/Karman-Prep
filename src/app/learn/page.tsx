import { redirect } from "next/navigation";

/** The old Learn landing page is now the student portal's Library (2026-11-08). */
export default function LearnPage() {
  redirect("/dashboard/student/library");
}
