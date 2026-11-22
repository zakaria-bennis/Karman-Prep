// The student portal (founder, 2026-11-21: the rebuilt portal is the only one). Everything the
// student sees is read here on the server (src/lib/portal/load.ts) and drawn by the portal in
// ./_portal, which the design page /dev/shell also shows with made-up students.
//   ?page=library|progress|mistakes|rewards|homework|schedule|chat|settings opens that tab, so the
//   quiz screens can send a student back to where they came from.
import type { Metadata } from "next";
import { loadPortalData } from "@/lib/portal/load";
import { loadStudentContext } from "@/lib/student/context";
import Portal from "./_portal/Shell";

export const metadata: Metadata = { title: "Your portal" };
export const dynamic = "force-dynamic";

export default async function StudentPortalPage() {
  const data = await loadPortalData(await loadStudentContext());
  return <Portal data={data} />;
}
