/*
 * One Library course on the overview: the percent in a ring, Up next (the skill with the
 * biggest score gain, no reason line), and each Domain as a row of skill squares.
 */
import Link from "next/link";
import { Card, Num, Ring, SectionHeader, SkillSquares, MoreLink } from "@/components/portal";
import { levelName } from "@/components/portal";
import type { Course } from "@/lib/student/course";
import { practiceSet } from "@/lib/student/quiz-routes";
import styles from "./library.module.css";

export const courseHref = (course: Pick<Course, "slug">, domainId?: string) =>
  `/dashboard/student/library/${course.slug}${domainId ? `?domain=${encodeURIComponent(domainId)}` : ""}`;

export default function CourseCard({ course }: { course: Course }) {
  const pct = Math.round(course.progress * 100);
  return (
    <Card label={course.name}>
      <SectionHeader title={course.name} />
      <div className={styles.course}>
        <div className={styles.head}>
          <Ring value={course.progress} size={64} label={`${course.name}: ${pct}%`}>
            <Num>{pct}%</Num>
          </Ring>
          <span>
            <b>
              <Num>{pct}%</Num> of the course
            </b>
            <small>
              <Num>{course.strong}</Num> of <Num>{course.total}</Num> skills at Understanding or
              above
            </small>
          </span>
        </div>
        {course.upNext && (
          <Link className={styles.upnext} href={practiceSet(course.upNext.id).path}>
            <span>
              <small>Up next</small>
              <b>{course.upNext.label}</b>
            </span>
            <span className={styles.go}>Practice</span>
          </Link>
        )}
        {course.domains.map((d) => (
          <Link key={d.id} className={styles.domain} href={courseHref(course, d.id)}>
            <span className={styles.domainHead}>
              <b>{d.label}</b>
              <small>
                <Num>{d.strong}</Num> of <Num>{d.skills.length}</Num>
              </small>
            </span>
            <SkillSquares
              skills={d.skills.map((s) => ({ level: s.level, name: s.label }))}
              label={`${d.label}: ${d.skills.map((s) => `${s.label} ${levelName(s.level)}`).join(", ")}`}
            />
          </Link>
        ))}
        <MoreLink href={courseHref(course)}>Open {course.name}</MoreLink>
      </div>
    </Card>
  );
}
