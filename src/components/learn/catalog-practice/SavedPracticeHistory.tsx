import Link from "next/link";
import type { CatalogPracticeHistory } from "@/lib/catalog-practice/history";

export default function SavedPracticeHistory({ history }: { history: CatalogPracticeHistory }) {
  return (
    <section aria-labelledby="skill-history-heading" className="mt-8">
      <h2 id="skill-history-heading" className="text-lg font-semibold text-ivory">
        Skill practice
      </h2>
      {history.status === "preview" ? (
        <p className="mt-3 text-sm text-taupe">
          Saved skill practice is available in the student’s own account.
        </p>
      ) : history.status === "unavailable" ? (
        <p role="status" className="mt-3 text-sm text-taupe">
          Saved skill practice could not load. Your answers are still saved; refresh to try again.
        </p>
      ) : history.sessions.length === 0 ? (
        <p className="mt-3 text-sm text-taupe">No saved skill practice yet.</p>
      ) : (
        <>
          <p className="mt-2 text-sm text-taupe">
            Your most recent unfinished and completed sessions.
          </p>
          <ul className="mt-4 space-y-3">
            {history.sessions.map((session) => (
              <li key={session.id} className="rounded-xl border border-bronze bg-surface p-5">
                <h3 className="font-semibold text-ivory">{session.title}</h3>
                <p className="mt-1 text-sm text-taupe">
                  Started{" "}
                  {new Date(session.startedAt).toLocaleDateString("en-US", {
                    timeZone: "UTC",
                    dateStyle: "medium",
                  })}{" "}
                  (UTC)
                </p>
                <p className="mt-2 text-sm text-taupe">
                  {session.completedAt
                    ? session.score === null
                      ? "Completed · saved result unavailable"
                      : `${session.score}% · this practice only`
                    : "In progress · your answers are saved"}
                </p>
                <Link
                  href={session.href}
                  className="mt-3 inline-flex min-h-11 items-center text-sm text-info underline underline-offset-4"
                >
                  {session.completedAt ? "Review skill practice" : "Continue skill practice"}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
