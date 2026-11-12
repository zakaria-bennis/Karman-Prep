/*
 * The daily report email for parents (founder, 2026-11-11: "the work done, the predicted score
 * and a note from the tutor"). Built the same way as the weekly recap (./recap.ts): plain HTML
 * from the same report object the portal page shows, so the preview and a send would match.
 * Nothing here sends; there is no scheduled job for it yet.
 */
import { levelName } from "@/components/portal/skill-levels";
import { dayLabel, type DailyReport } from "./daily-report-build";
import { esc } from "./recap";

export interface DailyEmailInput {
  childFirstName: string;
  parentFirstName: string | null;
  report: DailyReport;
  portalUrl: string;
}

export function dailySubject(input: DailyEmailInput): string {
  const day = dayLabel(input.report.day).split(",")[0];
  return `${input.childFirstName}'s ${day} at Karman`;
}

function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** The report as short lines, in the order the page shows them. */
export function dailyLines(input: DailyEmailInput): string[] {
  const { report: r, childFirstName: name } = input;
  const lines: string[] = [];
  if (r.answered) {
    lines.push(
      `Practice: ${plural(r.minutes, "minute")}, ${plural(r.answered, "question")}, ${r.accuracy}% right.`
    );
    const ups = r.skills.filter((s) => s.levelUp);
    const names = r.skills.slice(0, 4).map((s) => s.label);
    const more = r.skills.length - names.length;
    lines.push(
      `Skills practiced: ${names.join(", ")}${more > 0 ? ` and ${plural(more, "more skill")}` : ""}.`
    );
    for (const s of ups) lines.push(`Level up: ${s.label} reached ${levelName(s.levelUp!.to)}.`);
  } else {
    lines.push(`${name} didn't practice on this day.`);
  }
  const hw = r.homework;
  if (hw.completed.length)
    lines.push(`Homework finished: ${hw.completed.map((h) => h.title).join(", ")}.`);
  const [dueNow, dueNext] = r.isToday ? ["Due today", "Due tomorrow"] : ["Due", "Due the next day"];
  if (hw.dueToday.length) lines.push(`${dueNow}: ${hw.dueToday.map((h) => h.title).join(", ")}.`);
  if (hw.dueTomorrow.length)
    lines.push(`${dueNext}: ${hw.dueTomorrow.map((h) => h.title).join(", ")}.`);
  if (hw.pastDue.length) lines.push(`Past due: ${plural(hw.pastDue.length, "piece")} of homework.`);
  if (r.score.current !== null)
    lines.push(
      r.score.measuredThatDay
        ? `Predicted score: ${r.score.current}, from a new measure on this day.`
        : `Predicted score: ${r.score.current}.`
    );
  return lines;
}

export function dailyHtml(input: DailyEmailInput): string {
  const greeting = input.parentFirstName ? `Hi ${esc(input.parentFirstName)},` : "Hello,";
  const items = dailyLines(input)
    .map((l) => `<li style="margin:0 0 8px">${esc(l)}</li>`)
    .join("");
  const note = input.report.tutorNote;
  const noteBlock = note
    ? `<div style="margin:0 0 20px;padding:14px 16px;background:#f5f5f4;border-radius:4px">
<p style="margin:0 0 6px;font-size:13px;color:#57534e">From ${esc(note.from ?? "the tutor")}</p>
<p style="margin:0;font-size:16px;line-height:1.5;white-space:pre-line">${esc(note.body)}</p>
</div>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#f5f5f4;font-family:'Hanken Grotesk',Arial,sans-serif;color:#1c1917">
<div style="max-width:560px;margin:0 auto;padding:28px 22px;background:#ffffff">
<p style="margin:0 0 6px;font-size:13px;color:#57534e">${esc(dayLabel(input.report.day))}</p>
<h1 style="margin:0 0 16px;font-family:'Young Serif',Georgia,serif;font-weight:400;font-size:28px">${esc(input.childFirstName)}&rsquo;s day</h1>
<p style="margin:0 0 14px;font-size:16px">${greeting}</p>
<ul style="margin:0 0 18px;padding-left:20px;font-size:16px;line-height:1.5">${items}</ul>
${noteBlock}
<p style="margin:0 0 22px"><a href="${esc(input.portalUrl)}" style="display:inline-block;padding:12px 18px;background:#1c1917;color:#ffffff;text-decoration:none;border-radius:4px;font-weight:600">Open the full report</a></p>
<p style="margin:0;font-size:13px;color:#57534e">You get this because ${esc(input.childFirstName)} linked your account at Karman. It shows counts and skills, never single questions.</p>
</div></body></html>`;
}
