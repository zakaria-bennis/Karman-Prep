/**
 * A real calendar file for "Add to calendar": every item becomes an all-day
 * event (its time, when it has one, is in the description), the file is
 * offered as a download, and the toast says exactly that. Nothing is written
 * to any calendar: the parent opens the file and their own calendar adds the
 * dates. Honest, and a few lines.
 */
export interface CalendarItem {
  title: string;
  date: string;
  time?: string;
  who?: string;
}

const day = (iso: string) => iso.replace(/-/g, "");
const escape = (s: string) => s.replace(/[\;,]/g, (c) => `\\${c}`);
const nextDay = (iso: string) => {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
};

export function icsFor(items: CalendarItem[], stamp = new Date()): string {
  const now = stamp
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Karman Prep//Parent portal//EN",
    "CALSCALE:GREGORIAN",
  ];
  items.forEach((it, i) => {
    const title = it.who ? `${it.title} with ${it.who}` : it.title;
    lines.push(
      "BEGIN:VEVENT",
      `UID:karman-${it.date}-${i}@karmanprep.com`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${day(it.date)}`,
      `DTEND;VALUE=DATE:${day(nextDay(it.date))}`,
      `SUMMARY:${escape(title)}`,
      ...(it.time ? [`DESCRIPTION:${escape(it.time)}`] : []),
      "END:VEVENT"
    );
  });
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

/** Offers the file to save; returns how many dates it holds. */
export function downloadIcs(items: CalendarItem[], filename: string): number {
  const blob = new Blob([icsFor(items)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return items.length;
}

const sample = icsFor([{ title: "Full-length test 4", date: "2026-10-31", time: "9:00 am" }]);
console.assert(
  sample.includes("DTSTART;VALUE=DATE:20261031") && sample.includes("DTEND;VALUE=DATE:20261101"),
  "an all-day event ends the next day"
);
console.assert(
  (sample.match(/BEGIN:VEVENT/g) ?? []).length === 1 && sample.endsWith("END:VCALENDAR\r\n"),
  "one event, a complete calendar"
);
