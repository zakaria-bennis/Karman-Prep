/*
 * The daily report email for parents (founder, 2026-11-11: "the work done, the predicted score
 * and a note from the tutor"). Built the same way as the weekly recap (./recap.ts): plain HTML
 * from the same report object the portal page shows. It is a short brief for the evening (founder,
 * 2026-11-12: "almost like a brief on progress"); the Report tab is the full, visual version.
 * Sending lives in ./daily-email-run.ts and is off unless DAILY_PARENT_EMAIL=on.
 */
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

/**
 * The brief: at most four headline lines (work, level-ups, homework, score). Skill names, titles
 * and everything else live on the portal's Report tab, which the email links to.
 */
export function dailyLines(input: DailyEmailInput): string[] {
  const { report: r, childFirstName: name } = input;
  const lines: string[] = [];
  lines.push(
    r.answered
      ? `${plural(r.minutes, "minute")} of practice, ${plural(r.answered, "question")}, ${r.accuracy}% right.`
      : `${name} didn't practice ${r.isToday ? "today" : "that day"}.`
  );
  const ups = r.skills.filter((s) => s.levelUp).length;
  if (ups) lines.push(`${plural(ups, "skill")} moved up a level.`);
  const hw = r.homework;
  const due = hw.dueToday.length + hw.dueTomorrow.length;
  const parts = [
    hw.completed.length ? `${hw.completed.length} finished` : "",
    due ? `${due} due soon` : "",
    hw.pastDue.length ? `${hw.pastDue.length} past due` : "",
  ].filter(Boolean);
  if (parts.length) lines.push(`Homework: ${parts.join(", ")}.`);
  if (r.score.current !== null) lines.push(`Predicted score: ${r.score.current}.`);
  return lines;
}

/** A long tutor note is cut to its first 280 characters; the report shows it whole. */
function brief(text: string): string {
  return text.length > 280 ? `${text.slice(0, 279).trimEnd()}\u2026` : text;
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
<p style="margin:0;font-size:16px;line-height:1.5;white-space:pre-line">${esc(brief(note.body))}</p>
</div>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#f5f5f4;font-family:'Hanken Grotesk',Arial,sans-serif;color:#1c1917">
<div style="max-width:560px;margin:0 auto;padding:28px 22px;background:#ffffff">
<p style="margin:0 0 6px;font-size:13px;color:#57534e">${esc(dayLabel(input.report.day))}</p>
<h1 style="margin:0 0 16px;font-family:'Young Serif',Georgia,serif;font-weight:400;font-size:28px">${esc(input.childFirstName)}&rsquo;s day</h1>
<p style="margin:0 0 14px;font-size:16px">${greeting}</p>
<ul style="margin:0 0 18px;padding-left:20px;font-size:16px;line-height:1.5">${items}</ul>
${noteBlock}
<p style="margin:0 0 22px"><a href="${esc(input.portalUrl)}" style="display:inline-block;padding:12px 18px;background:#1c1917;color:#ffffff;text-decoration:none;border-radius:4px;font-weight:600">See the full report</a></p>
<p style="margin:0;font-size:13px;color:#57534e">You get this because ${esc(input.childFirstName)} linked your account at Karman. It shows counts and skills, never single questions.</p>
</div></body></html>`;
}
