// The Page Studio: flip through every page of the site, click and watch it work, comment on any
// element or retype its words, and send it all to Claude. See docs/page-studio.md.
import { readViewAs } from "@/lib/admin/impersonation-cookies";
import { sampleValues } from "@/lib/page-studio/samples";
import { accountName, listAccounts, listMarks, listNotes } from "@/lib/page-studio/store";
import type { ViewingAs } from "@/lib/page-studio/types";
import Studio from "./_ui/Studio";

export const dynamic = "force-dynamic";

export default async function StudioPage() {
  const [notes, marks, accounts, cookie] = await Promise.all([
    listNotes(),
    listMarks(),
    listAccounts(),
    readViewAs(),
  ]);
  let viewing: ViewingAs | null = null;
  if (cookie) {
    const who = cookie.userId ? await accountName(cookie.userId) : null;
    viewing = { role: cookie.role, userId: cookie.userId, name: who?.name ?? null };
  }
  return (
    <Studio
      initialNotes={notes}
      initialMarks={marks}
      accounts={accounts}
      initialViewing={viewing}
      samples={sampleValues()}
    />
  );
}
