// /join: a student adds their tutor's code in Settings (Parent, tutor and class).
import { toSettings } from "@/lib/portal/settings-redirects";

export const dynamic = "force-dynamic";

export default async function Page() {
  return toSettings("people", {}, "/join");
}
