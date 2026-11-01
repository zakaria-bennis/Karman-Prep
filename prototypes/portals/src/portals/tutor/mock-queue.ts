import { TODAY, studentById } from "@/mock";
import { tutorStudentById } from "./mock";

/**
 * The score-report queue: photos of official reports that wait for a person
 * to read them and enter the score, until the reader has its key. What each
 * photo shows is drawn in code; the image is private to the tutor and admin.
 */
export interface ReportUpload {
  id: string;
  studentId: string;
  claimed: "SAT" | "PSAT";
  uploadedAt: string;
  status: "waiting" | "entered";
  /** What the drawn report shows; the reader enters it by hand until the Jev key exists. */
  shows: { type: "SAT" | "PSAT"; date: string; rw: number; math: number };
  entered?: { type: "SAT" | "PSAT"; date: string; rw: number; math: number };
}
export const QUEUE: ReportUpload[] = [
  {
    id: "r1",
    studentId: "noah",
    claimed: "PSAT",
    uploadedAt: `${TODAY}T09:12`,
    status: "waiting",
    shows: { type: "PSAT", date: "2026-10-14", rw: 540, math: 510 },
  },
  {
    id: "r2",
    studentId: "owen",
    claimed: "SAT",
    uploadedAt: "2026-10-29T18:40",
    status: "waiting",
    shows: { type: "SAT", date: "2026-08-22", rw: 560, math: 560 },
  },
  {
    id: "r3",
    studentId: "jonah",
    claimed: "SAT",
    uploadedAt: "2026-10-22T20:05",
    status: "entered",
    shows: { type: "SAT", date: "2026-08-22", rw: 590, math: 560 },
    entered: { type: "SAT", date: "2026-08-22", rw: 590, math: 560 },
  },
];
export const queueName = (id: string) => tutorStudentById(id)?.name ?? studentById(id).name;
export const waiting = () => QUEUE.filter((r) => r.status === "waiting");

console.assert(waiting().length === 2, "two score reports wait for a reader");
console.assert(
  QUEUE[2].entered!.rw + QUEUE[2].entered!.math === tutorStudentById("jonah")!.baseline,
  "Jonah's entered report is his baseline"
);
console.assert(
  QUEUE[1].shows.rw + QUEUE[1].shows.math === tutorStudentById("owen")!.baseline,
  "Owen's report matches his baseline"
);
