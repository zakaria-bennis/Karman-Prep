"use client";

// Settings, Plan, on the local test copy only: the seeded accounts, so the founder can become a
// parent, a tutor, the admin or a student on another plan without leaving the portal (founder,
// 2026-11-25: it replaces the plain "Test sign-in" page; it sits quietly in Settings). Picking one
// opens that account's portal. The same list is in the parent's Settings, to come back.
import { useState } from "react";
import { switchHref, type TestAccount } from "@/lib/auth/test-accounts";
import { Group, Pick, Say } from "./settingsControls";

export function TestAccounts({ now, accounts }: { now: string | null; accounts: TestAccount[] }) {
  const [picked, setPicked] = useState(now);
  const [busy, setBusy] = useState(false);
  return (
    <Group title="Test accounts">
      <Say>Only on this test copy. Pick who to be and their portal opens.</Say>
      <Pick
        label="Test account"
        value={picked}
        options={accounts.map((a) => ({ value: a.id, label: a.name }))}
        onChange={(next) => {
          if (busy || !next || next === picked) return;
          setPicked(next);
          setBusy(true);
          window.location.assign(switchHref(next));
        }}
      />
    </Group>
  );
}
