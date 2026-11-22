// /dashboard/student/scholarship: the cohort scholarship lives in Settings (Scholarship), where a
// Cohort student uploads their score report and sees where their claim stands.
import { toSettings } from "@/lib/portal/settings-redirects";

export const dynamic = "force-dynamic";

export default async function Page() {
  return toSettings("scholarship", {}, "/dashboard/student/scholarship", true);
}
