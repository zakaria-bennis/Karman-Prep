import Link from "next/link";
import { ArrowRight, BookOpen, Calculator, CalendarDays, MessageSquare } from "lucide-react";
import type { LearnDashboardData, SubjectProgress } from "@/lib/learn/dashboard";
import { learningPlanCopy } from "@/lib/learning-plan/copy";

export default function LearnDashboard({
  dashboard,
  embedded = false,
  diagnostic = null,
}: {
  dashboard: LearnDashboardData;
  embedded?: boolean;
  diagnostic?: { score_range_low: number; score_range_high: number } | null;
}) {
  return (
    <div className="min-h-screen bg-night text-ivory">
      <div
        className={`mx-auto max-w-6xl px-5 pb-20 sm:px-8 ${embedded ? "pt-10" : "pt-28 sm:pt-32"}`}
      >
        <header className="max-w-2xl">
          <h1 className="type-display-m">Your study desk</h1>
          <p className="mt-3 text-base leading-relaxed text-taupe">
            Pick up a lesson, practice a subject, or look back at your answers.
          </p>
        </header>

        <div className="mt-10 grid gap-10 border-t border-bronze pt-8 lg:grid-cols-[minmax(0,1.55fr)_minmax(16rem,1fr)] lg:gap-16">
          <section aria-labelledby="next-heading">
            <h2 id="next-heading" className="type-h2">
              {learningPlanCopy.studentHeading}
            </h2>
            {dashboard.next ? (
              <div className="mt-5 border-l-4 border-gold bg-surface px-5 py-7 sm:px-7">
                <p className="text-sm text-gold">Earlier lesson</p>
                <h3 className="mt-2 font-plex-serif text-2xl leading-snug text-ivory sm:text-3xl">
                  {dashboard.next.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-taupe">{dashboard.next.detail}</p>
                <Link
                  href={dashboard.next.href}
                  className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-night hover:bg-gold-bright focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-bright"
                >
                  {dashboard.next.label} <ArrowRight aria-hidden className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <div className="mt-5 border-l-4 border-gold bg-surface px-5 py-7 sm:px-7">
                <h3 className="font-plex-serif text-2xl text-ivory sm:text-3xl">
                  Choose a subject to begin
                </h3>
                <p className="mt-3 max-w-lg text-sm leading-relaxed text-taupe">
                  Explore the skill catalog, then open an earlier lesson when you are ready to
                  practice. Your saved results will appear here.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <ActionLink href="/learn/reading">Reading &amp; Writing</ActionLink>
                  <ActionLink href="/learn/math">Math</ActionLink>
                </div>
              </div>
            )}
          </section>

          <section aria-labelledby="practice-heading">
            <h2 id="practice-heading" className="type-h2">
              Continue practice
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-taupe">
              Open the earlier lesson paths where quizzes are available.
            </p>
            <div className="mt-5 divide-y divide-bronze border-y border-bronze">
              <PracticeLink
                href="/learn/earlier/reading"
                icon={<BookOpen aria-hidden className="h-5 w-5 text-error" />}
                label="Reading & Writing"
              />
              <PracticeLink
                href="/learn/earlier/math"
                icon={<Calculator aria-hidden className="h-5 w-5 text-info" />}
                label="Math"
              />
            </div>
          </section>
        </div>

        <div className="mt-14 grid gap-12 border-t border-bronze pt-8 lg:grid-cols-2 lg:gap-16">
          <section aria-labelledby="review-heading">
            <h2 id="review-heading" className="type-h2">
              Review mistakes
            </h2>
            {dashboard.review ? (
              <div className="mt-5 border-b border-bronze pb-6">
                <p className="text-sm text-taupe">Most recent quiz with an incorrect answer</p>
                <h3 className="mt-2 text-lg font-medium text-ivory">{dashboard.review.title}</h3>
                <p className="mt-1 text-sm text-taupe">
                  {dashboard.review.incorrect} incorrect{" "}
                  {dashboard.review.incorrect === 1 ? "answer" : "answers"} saved
                </p>
                <TextLink href={dashboard.review.href}>Review saved answers</TextLink>
              </div>
            ) : (
              <p className="mt-5 text-sm leading-relaxed text-taupe">
                No completed quiz with an incorrect answer is saved yet.
              </p>
            )}
            <TextLink href="/dashboard/student/quizzes">View quiz history</TextLink>
          </section>

          <section aria-labelledby="skills-heading">
            <h2 id="skills-heading" className="type-h2">
              Skill areas
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-taupe">
              Earlier lesson results are saved separately from the 39-skill catalog. They do not
              measure mastery of these new skill areas.
            </p>
            <div className="mt-5 divide-y divide-bronze border-y border-bronze">
              {dashboard.subjects.map((subject) => (
                <SkillArea key={subject.subject} subject={subject} />
              ))}
            </div>
            <TextLink href="/learn/history">View earlier learning history</TextLink>
            {diagnostic && (
              <div className="mt-5 border-t border-bronze pt-4 text-sm text-taupe">
                <p>
                  Latest diagnostic estimate: {diagnostic.score_range_low}–
                  {diagnostic.score_range_high}
                </p>
                <TextLink href="/dashboard/student/progress">See diagnostic details</TextLink>
              </div>
            )}
          </section>
        </div>

        <section aria-labelledby="support-heading" className="mt-14 border-t border-bronze pt-8">
          <h2 id="support-heading" className="type-h2">
            Tutor support
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-taupe">
            Check your schedule or open your student chat. These pages show your current access and
            placement.
          </p>
          <div className="mt-5 flex flex-wrap gap-x-8 gap-y-2">
            <TextLink href="/dashboard/student/schedule">
              <CalendarDays aria-hidden className="h-4 w-4" /> View schedule
            </TextLink>
            <TextLink href="/dashboard/student/chat">
              <MessageSquare aria-hidden className="h-4 w-4" /> Open chat
            </TextLink>
          </div>
        </section>
      </div>
    </div>
  );
}

function ActionLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center rounded-lg border border-gold px-4 py-2 text-sm font-semibold text-gold hover:bg-gold/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-bright"
    >
      {children}
    </Link>
  );
}

function PracticeLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-16 items-center gap-3 py-3 text-ivory hover:text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-bright"
    >
      {icon}
      <span className="flex-1 text-sm font-medium">{label}</span>
      <ArrowRight aria-hidden className="h-4 w-4 text-taupe" />
    </Link>
  );
}

function SkillArea({ subject }: { subject: SubjectProgress }) {
  const name = subject.subject === "reading" ? "Reading & Writing" : "Math";
  return (
    <div className="py-4">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="text-sm font-semibold text-ivory">{name}</h3>
        <span className="shrink-0 text-xs tabular-nums text-taupe">
          {subject.skillCount} catalog skills
        </span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-taupe">
        {subject.savedLessons === 0
          ? "No earlier lesson work saved"
          : `Earlier lessons: ${subject.savedLessons} with saved work; ${subject.markedMastered} marked mastered; ${subject.underway} underway`}
      </p>
      <TextLink href={`/learn/${subject.subject}`}>Explore skills</TextLink>
    </div>
  );
}

function TextLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-gold underline decoration-gold/50 underline-offset-4 hover:text-gold-bright focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-bright"
    >
      {children}
    </Link>
  );
}
