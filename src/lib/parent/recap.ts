/*
 * The weekly recap email for parents (founder, 2026-11-07: "a weekly recap email"). Built from
 * the same counts the parent portal shows: homework, time, sessions, skills by level and one
 * predicted score. Never a question or an answer. Pure, so the preview and the send match.
 */
import type { ChildWeek } from "./server";

export interface RecapInput {
  childFirstName: string;
  parentFirstName: string | null;
  week: ChildWeek;
  portalUrl: string;
  weekOf: string;
}

const LEVEL_NAMES = ["Not started", "New", "Learning", "Understanding", "Conquered"] as const;

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
}

export function recapSubject(input: RecapInput): string {
  return `${input.childFirstName}'s week at Karman`;
}

export function recapLines(input: RecapInput): string[] {
  const { week, childFirstName: name } = input;
  const hw = week.homework;
  const total = hw.done + hw.open.length;
  const lines = [
    total
      ? `Homework: ${hw.done} of ${total} done${hw.late ? `, ${hw.late} past due` : ""}.`
      : "Homework: nothing set this week.",
    `Practice: ${week.minutesThisWeek} minutes in the last 7 days.`,
    week.upcoming[0]
      ? `Next session: ${new Date(week.upcoming[0].startsAt).toLocaleString("en-US", {
          weekday: "long",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
          timeZone: "America/Chicago",
        })} CT.`
      : "Next session: none booked.",
  ];
  if (week.score.current !== null) lines.push(`Predicted score: ${week.score.current}.`);
  const strong = week.glance.counts[3] + week.glance.counts[4];
  lines.push(`Skills: ${strong} at Understanding or Conquered, ${week.glance.counts[2]} at Learning.`);
  if (week.guarantee?.needed)
    lines.push(
      week.guarantee.met
        ? `Score guarantee: met, +${week.guarantee.gained} points.`
        : `Score guarantee: +${week.guarantee.gained} of +${week.guarantee.needed} points so far.`
    );
  if (!lines.length) lines.push(`${name} has not started yet.`);
  return lines;
}

export function recapHtml(input: RecapInput): string {
  const greeting = input.parentFirstName ? `Hi ${esc(input.parentFirstName)},` : "Hello,";
  const counts = input.week.glance.counts;
  const levelRows = [1, 2, 3, 4]
    .map(
      (l) =>
        `<tr><td style="padding:4px 0;color:#57534e">${LEVEL_NAMES[l]}</td><td style="padding:4px 0;text-align:right;font-variant-numeric:tabular-nums">${counts[l as 1 | 2 | 3 | 4]}</td></tr>`
    )
    .join("");
  const items = recapLines(input)
    .map((l) => `<li style="margin:0 0 8px">${esc(l)}</li>`)
    .join("");
  return `<!doctype html><html><body style="margin:0;background:#f5f5f4;font-family:'Hanken Grotesk',Arial,sans-serif;color:#1c1917">
<div style="max-width:560px;margin:0 auto;padding:28px 22px;background:#ffffff">
<p style="margin:0 0 6px;font-size:13px;color:#57534e">Week of ${esc(input.weekOf)}</p>
<h1 style="margin:0 0 16px;font-family:'Young Serif',Georgia,serif;font-weight:400;font-size:28px">${esc(input.childFirstName)}&rsquo;s week</h1>
<p style="margin:0 0 14px;font-size:16px">${greeting}</p>
<ul style="margin:0 0 18px;padding-left:20px;font-size:16px;line-height:1.5">${items}</ul>
<table role="presentation" style="width:100%;border-collapse:collapse;font-size:15px;margin:0 0 20px">${levelRows}</table>
<p style="margin:0 0 22px"><a href="${esc(input.portalUrl)}" style="display:inline-block;padding:12px 18px;background:#1c1917;color:#ffffff;text-decoration:none;border-radius:4px;font-weight:600">Open the parent portal</a></p>
<p style="margin:0;font-size:13px;color:#57534e">You get this because ${esc(input.childFirstName)} linked your account at Karman. It shows the big picture only.</p>
</div></body></html>`;
}
