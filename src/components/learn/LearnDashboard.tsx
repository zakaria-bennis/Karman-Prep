import Link from "next/link";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import StudyPreview from "@/components/learn/StudyPreview";
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
        className={`mx-auto max-w-6xl px-5 pb-16 sm:px-8 ${embedded ? "pt-8 sm:pt-10" : "pt-28 sm:pt-32"}`}
      >
        <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
          <div className="max-w-2xl">
            <h1 className="type-display-m">Your study desk</h1>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-taupe">
              {dashboard.next
                ? "Pick up a lesson, or make room for a new focus."
                : "One skill at a time. Find a place to start, and make it yours."}
            </p>
          </div>
          {diagnostic && (
            <TextLink href="/dashboard/student/progress">See diagnostic details</TextLink>
          )}
        </header>
        {dashboard.skillHistoryStatus === "unavailable" && (
          <p role="status" className="mt-5 text-sm text-taupe">
            Saved skill practice could not load. Your answers are still saved; refresh to try again.
          </p>
        )}
        {dashboard.skillHistoryStatus === "preview" && (
          <p role="status" className="mt-5 text-sm text-taupe">
            Saved skill practice is available in the student’s own account.
          </p>
        )}

        <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] lg:gap-12">
          <section
            aria-labelledby="next-heading"
            className="min-w-0 rounded-[1.75rem] bg-surface p-6 ring-1 ring-inset ring-bronze/50 sm:p-8"
          >
            <h2 id="next-heading" className="text-sm font-semibold text-ivory">
              {learningPlanCopy.studentHeading}
            </h2>
            {dashboard.next ? (
              <>
                <h3 className="mt-5 break-words font-plex-serif text-3xl leading-tight sm:text-4xl">
                  {dashboard.next.title}
                </h3>
                <p className="mt-4 max-w-lg text-sm leading-relaxed text-taupe">
                  {dashboard.next.detail}
                </p>
                <Link
                  href={dashboard.next.href}
                  className="mt-6 inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-gold px-6 py-3 text-sm font-semibold text-night hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ivory"
                >
                  {dashboard.next.label}
                  <ArrowUpRight aria-hidden="true" className="h-4 w-4 shrink-0" />
                </Link>
                <p className="mt-4 text-xs leading-relaxed text-taupe">
                  {dashboard.next.kind === "skill" ? "Skill practice" : "Earlier lesson"}
                </p>
              </>
            ) : (
              <>
                <h3 className="mt-5 font-plex-serif text-3xl leading-tight sm:text-4xl">
                  Choose a subject to begin
                </h3>
                <p className="mt-4 max-w-lg text-sm leading-relaxed text-taupe">
                  Open the skill catalog below, or start with a subject. Your saved lesson work will
                  appear here.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <SubjectLink href="/learn/reading">Reading &amp; Writing</SubjectLink>
                  <SubjectLink href="/learn/math">Math</SubjectLink>
                </div>
                {!diagnostic && (
                  <div className="mt-6 border-t border-bronze/60 pt-4">
                    <p className="text-sm leading-relaxed text-taupe">
                      Want a closer look at your starting point?
                    </p>
                    <TextLink href="/diagnostic">Take the diagnostic</TextLink>
                  </div>
                )}
              </>
            )}
          </section>

          <section aria-labelledby="review-heading" className="min-w-0 py-1 lg:py-5">
            <h2 id="review-heading" className="font-plex-serif text-2xl sm:text-3xl">
              Take another look
            </h2>
            {dashboard.review ? (
              <>
                <p className="mt-5 text-sm font-medium text-ivory">
                  {dashboard.review.resultUnavailable
                    ? "Saved result unavailable"
                    : dashboard.review.incorrect === null
                      ? "Saved skill practice to review"
                      : `${dashboard.review.incorrect} saved ${dashboard.review.incorrect === 1 ? "answer" : "answers"} to review`}
                </p>
                <h3 className="mt-2 break-words text-lg font-semibold leading-snug">
                  {dashboard.review.title}
                </h3>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-taupe">
                  Revisit your saved answers from this{" "}
                  {dashboard.review.kind === "skill" ? "practice session" : "earlier quiz"}.
                </p>
                <TextLink href={dashboard.review.href}>Review saved answers</TextLink>
              </>
            ) : (
              <p className="mt-4 max-w-md text-sm leading-relaxed text-taupe">
                {dashboard.skillHistoryStatus === "unavailable" ||
                dashboard.skillHistoryStatus === "preview"
                  ? "Open quiz history to see the saved work available in this view."
                  : "No missed answers to review yet. After a quiz, come back to work through any questions that caught you out."}
              </p>
            )}
            <div className="mt-3">
              <TextLink href="/dashboard/student/quizzes">View quiz history</TextLink>
            </div>
          </section>
        </div>

        <section aria-labelledby="practice-heading" className="mt-12 sm:mt-16">
          <h2 id="practice-heading" className="mb-6 font-plex-serif text-3xl sm:text-4xl">
            Choose a SAT focus
          </h2>
          <StudyPreview />
        </section>

        <div className="mt-12 grid gap-8 border-t border-bronze pt-8 sm:mt-16 lg:grid-cols-2 lg:gap-16">
          <section aria-labelledby="daily-heading">
            <h2 id="daily-heading" className="font-plex-serif text-2xl sm:text-3xl">
              A word break
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-taupe">
              Try today&rsquo;s vocabulary puzzle, or explore prefixes, roots, and suffixes.
            </p>
            <TextLink href="/learn/daily#daily-vocabulary">Open vocabulary and word parts</TextLink>
          </section>
          <section aria-labelledby="support-heading">
            <h2 id="support-heading" className="font-plex-serif text-2xl sm:text-3xl">
              Bring it to your tutor
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-taupe">
              A step that lost you, or an answer that almost made sense. Make a note for your next
              conversation.
            </p>
            <div className="mt-1 flex flex-wrap gap-x-6 gap-y-1">
              <TextLink href="/dashboard/student/schedule">View schedule</TextLink>
              <TextLink href="/dashboard/student/chat">Open chat</TextLink>
            </div>
          </section>
        </div>

        <details className="group mt-10 rounded-2xl border border-bronze px-5 sm:mt-12 sm:px-6">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-lg py-4 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ivory [&::-webkit-details-marker]:hidden">
            Your saved lesson work
            <ChevronDown
              aria-hidden="true"
              className="h-4 w-4 shrink-0 group-open:rotate-180 motion-safe:transition-transform"
            />
          </summary>
          <div className="border-t border-bronze pb-5 pt-4">
            <p className="max-w-2xl text-sm leading-relaxed text-taupe">
              These counts come from earlier lessons. They do not measure mastery of the current
              skill catalog.
            </p>
            <div className="mt-5 grid gap-6 sm:grid-cols-2">
              {dashboard.subjects.map((subject) => (
                <SavedSubject key={subject.subject} subject={subject} />
              ))}
            </div>
            <TextLink href="/learn/history">View earlier learning history</TextLink>
            <div className="mt-2 flex flex-wrap gap-x-6">
              <TextLink href="/learn/earlier/reading">
                Earlier Reading &amp; Writing lessons
              </TextLink>
              <TextLink href="/learn/earlier/math">Earlier Math lessons</TextLink>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}

function SavedSubject({ subject }: { subject: SubjectProgress }) {
  return (
    <div>
      <h3 className="text-sm font-semibold">
        {subject.subject === "reading" ? "Reading & Writing" : "Math"}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-taupe">
        {subject.savedLessons === 0
          ? "No earlier lesson work saved"
          : `${subject.savedLessons} with saved work; ${subject.markedMastered} marked mastered; ${subject.underway} underway`}
      </p>
    </div>
  );
}

function SubjectLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-12 items-center rounded-full border border-bronze px-4 py-3 text-sm font-semibold text-ivory hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ivory"
    >
      {children}
    </Link>
  );
}

function TextLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-sm py-2 text-sm font-medium text-ivory underline decoration-bronze underline-offset-4 hover:decoration-current focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ivory"
    >
      {children}
    </Link>
  );
}
