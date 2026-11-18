/*
 * /dev/library-shinkai: still frames of the Shinkai-style Library opening for the founder to
 * approve before anything is animated (2026-11-08). No database, no sign-in; 404 in production.
 *
 *   ?frame=sky|descent|observatory|library|box   what to show
 *   &time=dawn|day|sunset|night                  the light
 *   &hover=math|rw                               (sky) a side pointed at
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Panel, PortalShell } from "@/components/portal";
import { studentNav } from "@/components/student-portal/StudentPortal";
import CourseView from "@/components/student-portal/library/CourseView";
import LibrarySide from "@/components/student-portal/library/LibrarySide";
import stage from "@/components/student-portal/library/stage.module.css";
import { fixtureCourses } from "../library-intros/fixtures";
import ShinkaiFrame from "./ShinkaiFrame";

export const metadata: Metadata = {
  title: "Library stills (dev)",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const query = z.object({
  frame: z.enum(["sky", "descent", "observatory", "library", "box"]).default("sky"),
  time: z.enum(["dawn", "day", "sunset", "night"]).default("day"),
  hover: z.enum(["math", "rw"]).optional(),
});

export default async function LibraryShinkaiDevPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const q = query.safeParse((await searchParams) ?? {});
  const { frame, time, hover } = q.success
    ? q.data
    : { frame: "sky" as const, time: "day" as const, hover: undefined };
  const box = frame === "box";
  const { math } = fixtureCourses();
  return (
    <PortalShell
      portal="Student"
      nav={studentNav({ hasTutor: true, homeworkOpen: 2, showCalendar: true })}
      title="Library"
      name="Ava"
      streak={{ days: 5, href: "/dev/library-shinkai" }}
      home="/dev/library-shinkai"
    >
      <ShinkaiFrame
        frame={box ? "observatory" : frame}
        time={time}
        hover={hover ?? null}
        behindBox={box}
      />
      {box && (
        <Panel
          side={
            <LibrarySide challengeAnswered={0} left={null} questionLimit={null} testLimit={null} />
          }
          banner={
            <div className={stage.boxTop}>
              <div className={stage.toggle}>
                <span className={stage.tab} aria-pressed="true">
                  <span className={stage.pill} />
                  <span className={stage.tabLabel}>Math 6%</span>
                </span>
                <span className={stage.tab}>
                  <span className={stage.tabLabel}>Reading and Writing 8%</span>
                </span>
              </div>
              <span className={stage.close}>Close</span>
            </div>
          }
        >
          <div className={stage.view}>
            <CourseView course={math} />
          </div>
        </Panel>
      )}
    </PortalShell>
  );
}
