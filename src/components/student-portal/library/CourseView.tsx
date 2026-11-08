/*
 * One Library course at a time (founder, 2026-11-08): picking Math shows only Math, and the
 * same for Reading and Writing, with a clear switch between them. The course leads with one
 * thing to do next (its Up next sub-skill, the screen's only main button), then each Domain as a
 * card that opens in place. Inside, the official College Board skills are headings and their
 * sub-skills are the squares, each with its level and its own practice set.
 */
import Link from "next/link";
import {
  Cta,
  Expand,
  Num,
  Ring,
  SkillSquares,
  SKILL_LEVELS,
  levelName,
  MoreLink,
} from "@/components/portal";
import type { Course, CourseDomain } from "@/lib/student/course";
import { domainQuiz, practiceSet } from "@/lib/student/quiz-routes";
import styles from "./library.module.css";

export const courseHref = (course: Pick<Course, "slug">, domainId?: string) =>
  `/dashboard/student/library/${course.slug}${domainId ? `?domain=${encodeURIComponent(domainId)}` : ""}`;

export const librarySubjectHref = (slug: Course["slug"]) =>
  `/dashboard/student/library?subject=${slug}`;

/** The switch between the two courses: two big tabs, the open one filled. */
export function CourseSwitch({ courses, open }: { courses: Course[]; open: Course["slug"] }) {
  return (
    <nav className={styles.switch} aria-label="Course">
      {courses.map((c) => (
        <Link
          key={c.slug}
          href={librarySubjectHref(c.slug)}
          aria-current={c.slug === open ? "page" : undefined}
          className={styles.switchTab}
        >
          <span>{c.slug === "math" ? "Math" : "Reading and Writing"}</span>
          <small>
            <Num>{Math.round(c.progress * 100)}%</Num>
          </small>
        </Link>
      ))}
    </nav>
  );
}

/** A Domain's wash: the level shade it has reached, never lighter than the second. */
const tintFor = (d: CourseDomain) => `var(--l${Math.min(4, 2 + Math.floor(d.progress * 3))})`;

export default function CourseView({ course }: { course: Course }) {
  const pct = Math.round(course.progress * 100);
  const next = course.upNext;
  return (
    <>
      <section className={styles.next} aria-labelledby="next-skill">
        <Ring value={course.progress} size={64} width={6} label={`${course.name}: ${pct}%`}>
          <Num>{pct}%</Num>
        </Ring>
        <div className={styles.nextText}>
          {next ? (
            <>
              <h2 id="next-skill" className={styles.nextTitle}>
                {next.label}
              </h2>
              <p className={styles.nextSub}>
                {next.official !== next.label && <>In {next.official}. </>}
                <Num>{course.strong}</Num> of <Num>{course.total}</Num> skills at Understanding or
                above.
              </p>
              <Cta href={practiceSet(next.id).path}>Start practice</Cta>
            </>
          ) : (
            <>
              <h2 id="next-skill" className={styles.nextTitle}>
                Every skill Conquered
              </h2>
              <p className={styles.nextSub}>Keep it that way with a Domain quiz below.</p>
            </>
          )}
        </div>
      </section>

      <h2 className={styles.domainsTitle}>Domains</h2>
      <div className={styles.domains}>
        {course.domains.map((d) => (
          <Expand
            key={d.id}
            tint={tintFor(d)}
            label={d.label}
            defaultOpen={d.id === next?.domainId}
            summary={
              <span className={styles.domainSum}>
                <span className={styles.domainHead}>
                  <b>{d.label}</b>
                  <small>
                    <Num>{d.strong}</Num> of <Num>{d.skills.length}</Num> strong
                  </small>
                </span>
                <span className={styles.groups}>
                  {d.officials.map((o) => (
                    <SkillSquares
                      key={o.id}
                      skills={o.skills.map((s) => ({ level: s.level, name: s.label }))}
                      label={`${o.label}: ${o.skills.map((s) => `${s.label} ${levelName(s.level)}`).join(", ")}`}
                    />
                  ))}
                </span>
              </span>
            }
          >
            {d.officials.map((o) => (
              <section key={o.id} className={styles.official} aria-label={o.label}>
                {!(o.skills.length === 1 && o.skills[0].label === o.label) && <h3>{o.label}</h3>}
                <ul className={styles.skills}>
                  {o.skills.map((s) => (
                    <li key={s.id}>
                      <Link className={styles.skill} href={practiceSet(s.id).path}>
                        <i
                          className={styles.dot}
                          style={{
                            background: SKILL_LEVELS[s.level].color ?? "transparent",
                          }}
                          aria-hidden="true"
                        />
                        <span>
                          <b>{s.label}</b>
                          <small>{levelName(s.level)}</small>
                        </span>
                        <span className={styles.go}>Practice</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
            <div className={styles.domainLinks}>
              <MoreLink href={domainQuiz(d.id).path}>Domain quiz</MoreLink>
              <MoreLink href={courseHref(course, d.id)}>Open {d.label}</MoreLink>
            </div>
          </Expand>
        ))}
      </div>
    </>
  );
}
