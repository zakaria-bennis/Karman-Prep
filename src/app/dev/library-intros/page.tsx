/*
 * /dev/library-intros: a dev-only preview of the Library's opening animations (founder,
 * 2026-11-08), with no database and no sign-in, for comparing and recording the intros.
 *
 *   ?intro=N              the intro to play (intro 1 without it); the picker switches
 *   ?paint-time=day|...   the light (dawn, day, sunset, night)
 *   ?challenge=1          the full-screen Challenge banner first, as in the real Library
 *
 * It renders the real painted shell, the real Library stage and box, with fixture courses (Math
 * 6%, Reading and Writing 8%). Production builds return 404 (NODE_ENV is fixed at build time).
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { PortalShell } from "@/components/portal";
import { studentNav } from "@/components/student-portal/StudentPortal";
import ChallengeMoment from "@/components/student-portal/library/ChallengeMoment";
import CourseView from "@/components/student-portal/library/CourseView";
import LibrarySide from "@/components/student-portal/library/LibrarySide";
import LibraryStage from "@/components/student-portal/library/LibraryStage";
import { fixtureCourses } from "./fixtures";

export const metadata: Metadata = {
  title: "Library intros (dev)",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const query = z.object({
  intro: z.coerce.number().int().min(1).max(99).optional(),
  challenge: z.enum(["1"]).optional(),
});

export default async function LibraryIntrosDevPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const q = query.safeParse((await searchParams) ?? {});
  const intro = q.success ? (q.data.intro ?? 1) : 1;
  const challenge = q.success && q.data.challenge === "1";
  const { math, reading } = fixtureCourses();
  return (
    <PortalShell
      portal="Student"
      nav={studentNav({ hasTutor: true, homeworkOpen: 2, showCalendar: true })}
      title="Library"
      name="Ava"
      streak={{ days: 5, href: "/dev/library-intros" }}
      home="/dev/library-intros"
    >
      <LibraryStage
        courses={[math, reading].map((c) => ({ slug: c.slug, name: c.name, progress: c.progress }))}
        views={{
          math: <CourseView course={math} />,
          "reading-writing": <CourseView course={reading} />,
        }}
        side={
          <LibrarySide challengeAnswered={0} left={null} questionLimit={null} testLimit={null} />
        }
        initial={null}
        intro={intro}
        waitForChallenge={challenge}
      />
      {challenge && (
        /* A fresh day key each visit, so the banner always opens here. */
        <ChallengeMoment href="/dev/library-intros" day={`preview-${Date.now()}`} answered={0} />
      )}
    </PortalShell>
  );
}
