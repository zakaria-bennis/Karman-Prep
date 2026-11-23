"use client";

// Settings, Plan: the testing switch (founder, 2026-11-23: "anyone who accesses the website now is a
// tester, so they should be able to freely go from one plan to another"). It shows only while the
// site password is on. A pick is saved with the account on the server (src/lib/plans/tester.ts), and
// the portal opens again on it, so its menu, limits and locks are that plan's. Stripe is never called.
import { useState } from "react";
import { actionSetTesterPlan } from "@/lib/portal/settings-plan-actions";
import { settingsHref } from "@/lib/portal/settings-rules";
import { isTesterPlanId, TESTER_PLAN_IDS, type TesterPlanId } from "@/lib/plans/tester";
import type { PlanId } from "@/lib/plans/catalog";
import { PLAN_NAMES } from "@/lib/student/plan-gate";
import { Group, Pick, Say } from "./settingsControls";

const LABEL: Record<TesterPlanId, string> = {
  free: PLAN_NAMES.free,
  practice: PLAN_NAMES.practice,
  pro: PLAN_NAMES.pro,
  cohort: "Cohort",
  "private-10": "Private",
};

/** What a taught plan cannot show a tester, who is in no real class and has no real tutor. */
const MISSING: Partial<Record<TesterPlanId, string>> = {
  cohort: "You're not in a real class, so Chat is empty and there are no class sessions.",
  "private-10": "You don't have a real tutor, so Chat is empty and no times are open to book.",
};

export function TesterSwitch({ planId }: { planId: PlanId }) {
  const [picked, setPicked] = useState<TesterPlanId | null>(isTesterPlanId(planId) ? planId : null);
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<string | null>(null);

  const choose = (next: TesterPlanId | null) => {
    if (busy || next === null || next === picked) return;
    const was = picked;
    setPicked(next);
    setBusy(true);
    setSaid(null);
    const failed = (error: string) => {
      setPicked(was);
      setBusy(false);
      setSaid(error);
    };
    actionSetTesterPlan({ planId: next })
      .then((r) => {
        // the whole portal opens again, so every page reads the new plan from the server
        if (r.ok) window.location.assign(settingsHref("plan"));
        else failed(r.error);
      })
      .catch(() => failed("That didn't switch. Try again in a moment."));
  };

  const missing = picked ? MISSING[picked] : undefined;
  return (
    <Group title="Testing">
      <Say>
        Karman is private while we test it, so you can switch to any plan here for free. Nothing is
        charged. This switch goes away at launch.
      </Say>
      <Pick
        label="Plan to test"
        value={picked}
        options={TESTER_PLAN_IDS.map((id) => ({ value: id, label: LABEL[id] }))}
        onChange={choose}
      />
      {busy && <Say>Switching to {picked ? LABEL[picked] : "that plan"}.</Say>}
      {!busy && missing && <Say>{missing}</Say>}
      {said && <Say tone="problem">{said}</Say>}
    </Group>
  );
}
