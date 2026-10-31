import { redirect } from "next/navigation";

// The historical forecast converted mastery events to unsupported SAT points.
// Keep old bookmarks useful by sending them to measured diagnostic/practice data.
// The existing student layout and destination enforce account/role access.
export default function PredictedSATPage() {
  redirect("/dashboard/student/progress");
}
