import Link from "next/link";
import { ArrowUpRight, CalendarDays, History, Sparkles } from "lucide-react";

const PATHS = [
  {
    icon: CalendarDays,
    title: "Keep your week in view",
    body: "See booked sessions and work posted by your educator together. Choose practice around the commitments already in your calendar.",
    href: "/dashboard/student",
    action: "Open your week",
  },
  {
    icon: Sparkles,
    title: "Make room for a daily habit",
    body: "Explore a daily SAT challenge, verified vocabulary, and word-part cards. Small sessions give you a reason to keep showing up.",
    href: "/learn/daily",
    action: "Explore daily practice",
  },
  {
    icon: History,
    title: "Learn from your last attempt",
    body: "Return to saved quizzes, see your answers, and review the questions you missed. Your next session can build on the last one.",
    href: "/dashboard/student/quizzes",
    action: "See quiz history",
  },
];
export default function ProductPreview() {
  return (
    <section className="bg-surface px-5 py-16 text-ivory md:px-8 md:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-2xl">
          <h2 className="font-plex-sans text-3xl font-medium leading-tight tracking-tight sm:text-5xl">
            Less searching. More studying.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-taupe">
            One place to pick up your work and see what comes next.
          </p>
        </div>
        <div className="mt-10 grid gap-8 md:grid-cols-3 md:gap-12">
          {PATHS.map(({ icon: Icon, title, body, href, action }) => (
            <article key={href} className="border-t border-bronze/40 pt-6">
              <Icon className="h-7 w-7 text-gold" aria-hidden="true" />
              <h3 className="mt-5 font-plex-serif text-2xl leading-tight">{title}</h3>
              <p className="mt-4 leading-relaxed text-taupe">{body}</p>
              <Link
                href={href}
                className="mt-5 inline-flex min-h-11 items-center gap-2 font-medium underline underline-offset-4"
              >
                {action}
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </article>
          ))}
        </div>
        <p className="mt-10 text-sm text-taupe">
          Sign in to open your workspace. Practice availability depends on your access and reviewed
          content.
        </p>
      </div>
    </section>
  );
}
