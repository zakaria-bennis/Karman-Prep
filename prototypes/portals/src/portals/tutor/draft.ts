import { fmtDate } from "@/mock";
import { ME, type Booking, type TutorStudent, hour } from "./mock";
import type { FullLength } from "./mock-tests";
import type { Assignment } from "./mock-work";
import type { BriefingItem } from "./screens/Briefing";
import { dayDate } from "./screens/common";

/** The parent update, drafted from the briefing's covered items. Plain words, no claims, no em dashes. */
export function buildDraft({
  s,
  covered,
  latest,
  sessionDate,
  next,
  hw,
}: {
  s: TutorStudent;
  covered: BriefingItem[];
  latest: FullLength | undefined;
  sessionDate: string;
  next: Booking | null;
  hw: Assignment | undefined;
}): { subject: string; body: string } {
  const skills = covered.filter((i) => i.band !== undefined);
  const lines = [
    `Hi ${s.parent.name},`,
    "",
    latest
      ? `Today ${s.name} and I went through full-length test ${latest.number} (${latest.total.toLocaleString("en-US")}).${skills.length ? " We covered:" : ""}`
      : `Today ${s.name} and I worked on the first skills of the plan.`,
    ...skills.map(
      (i) => `${i.label}: ${i.detail.split(":")[0].replace(" missed", " missed on the test")}`
    ),
    ...(covered.some((i) => i.id === "pacing")
      ? ["", "We also worked on pacing: finishing each module with two minutes to spare."]
      : []),
    "",
    `Next session: ${next ? `${dayDate(next.date)}, ${hour(next.start)} ET.` : `not booked yet. ${s.name} can book it from the app.`}`,
    `Homework: ${hw ? `${hw.title}, due ${fmtDate(hw.due)}.` : "none this week."}`,
    "",
    ME.name,
  ];
  return { subject: `${s.name}'s session, ${dayDate(sessionDate)}`, body: lines.join("\n") };
}

export function buildClassDraft({
  cohortName,
  tutor,
  covered,
  classDate,
  nextDate,
}: {
  cohortName: string;
  tutor: string;
  covered: string[];
  classDate: string;
  nextDate: string;
}): { subject: string; body: string } {
  const lines = [
    "Hi,",
    "",
    `Tonight the ${cohortName} worked on the skills most of the group missed on the last full-length test:`,
    ...covered.map((c) => `${c}`),
    "",
    "Each student practised the same skills at their own difficulty. Their own misses come back in Your Daily 10 over the next three weeks.",
    "",
    `Next class: ${dayDate(nextDate)}, 7:00 pm ET. The next full-length test is Saturday.`,
    "",
    tutor,
  ];
  return { subject: `${cohortName}, class on ${dayDate(classDate)}`, body: lines.join("\n") };
}
