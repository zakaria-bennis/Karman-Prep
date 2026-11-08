/*
 * Rotating greetings in place of "Welcome back" (founder, 2026-11-07). The voice follows the
 * hour: calm late at night, warm in the evening, playful on weekends. Day lines only show on
 * their day. The SAT date only appears as milestone lines at 100, 60, 30, 14 and 7 days.
 * Ported from prototypes/today-directions/today.js.
 */
import { bandOf } from "@/lib/painting/schedule";

const lines = (n: string) => ({
  night: [
    `Still up, ${n}?`,
    "Quiet hours.",
    `The house is asleep, ${n}.`,
    "Late one tonight.",
    "One thing, then rest.",
    `Midnight focus, ${n}.`,
    "Soft light, clear head.",
    "The world's quiet. Good time to think.",
    `Night owl mode, ${n}.`,
    "Short and sharp tonight.",
    "Moon's out. So are you.",
    "Small steps count at this hour too.",
  ],
  morning: [
    `Morning, ${n}.`,
    "Early start. Nice.",
    `Good morning, ${n}.`,
    "Fresh brain, fresh start.",
    `Up and at it, ${n}.`,
    "A clear morning for clear answers.",
    `Rise and focus, ${n}.`,
    "The day's still yours.",
  ],
  schoolMorning: ["Before school? Respect.", "A few questions before first period?"],
  day: [
    `Afternoon, ${n}.`,
    `Good to see you, ${n}.`,
    "Snack first, then the Daily 10.",
    `Hey ${n}. Ready when you are.`,
    "Midday reset.",
    "A good hour for a good set.",
    `Let's make it count, ${n}.`,
  ],
  schoolDay: ["Back from school?", "School's out. Brain's still on."],
  evening: [
    `Evening, ${n}.`,
    `Back at it, ${n}.`,
    "Golden hour.",
    "Tonight's yours.",
    `Good evening, ${n}.`,
    "Dinner done? Let's go.",
    `Here we go, ${n}.`,
    "A calm evening for good work.",
    "Settle in.",
    `Nice to see you tonight, ${n}.`,
  ],
  weekend: [
    "Weekend mode: brain on.",
    `Weekend, and you're here, ${n}.`,
    "No school. All gains.",
    "Lazy day, sharp mind.",
  ],
  saturday: ["Saturday scholar.", "Saturday plans: crush the Daily 10."],
  sunday: ["Sunday study. Legend move.", "Sunday reset. Set up the week."],
  friday: [
    "Friday night study. Respect.",
    `It's Friday, ${n}. You're built different.`,
    "Friday. One set, then freedom.",
  ],
});

const MILESTONES: Record<number, string> = {
  100: "100 days to the SAT. Plenty of time, if you use it.",
  60: "Two months to go. This is where it adds up.",
  30: "30 days out. Every night counts now.",
  14: "Two weeks. Time to sharpen, not cram.",
  7: "One week. You've done the work.",
};

/** A greeting for this moment. Without a name the lines still read well ("Morning."). */
export function pickGreeting(now: Date, name?: string | null, satDate?: Date | null): string {
  if (satDate) {
    const left = Math.ceil((satDate.getTime() - now.getTime()) / 864e5);
    if (MILESTONES[left]) return MILESTONES[left];
  }
  const L = lines(name?.trim() || "there");
  const h = now.getHours();
  const day = now.getDay();
  const weekend = day === 0 || day === 6;
  const band = bandOf(h);
  let pool = L[band];
  if (!weekend && band === "morning") pool = pool.concat(L.schoolMorning);
  if (!weekend && band === "day") pool = pool.concat(L.schoolDay);
  if (weekend && h >= 9 && h < 21) pool = L.weekend.concat(day === 6 ? L.saturday : L.sunday);
  if (day === 5 && h >= 17 && h < 23) pool = L.friday.concat(L.evening);
  if (!name?.trim()) pool = pool.filter((line) => !line.includes("there"));
  return pool[Math.floor(Math.random() * pool.length)] ?? "Good to see you.";
}
