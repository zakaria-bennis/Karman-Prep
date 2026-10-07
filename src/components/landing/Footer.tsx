import Link from "next/link";
import LandingLogo from "./LandingLogo";

const LINKS = [
  { label: "How it works", href: "/#how-it-works" },
  { label: "Diagnostic", href: "/#sample-quiz" },
  { label: "Plans", href: "/#pricing" },
  { label: "About", href: "/about" },
  { label: "Questions", href: "/faq" },
];

export default function Footer() {
  return (
    <footer className="border-t border-bronze bg-charcoal text-ivory">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:px-8">
        <div>
          <Link href="/" aria-label="Karman home" className="inline-flex">
            <LandingLogo />
          </Link>
          <p className="mt-5 max-w-sm leading-relaxed text-taupe">
            Digital SAT practice, a signed-in diagnostic, and tutoring support in one place.
          </p>
          <a
            href="mailto:support@karmanprep.com"
            className="mt-5 inline-block font-semibold text-ivory underline underline-offset-4 hover:text-gold-bright"
          >
            Email Karman support
          </a>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          <nav aria-label="Footer product links" className="col-span-2 sm:col-span-1">
            <ul className="space-y-3">
              {LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-taupe hover:text-ivory">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Footer policies" className="col-span-2 sm:col-span-2">
            <ul className="space-y-3">
              <li>
                <Link href="/privacy" className="text-sm text-taupe hover:text-ivory">
                  Privacy policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-sm text-taupe hover:text-ivory">
                  Terms of service
                </Link>
              </li>
              <li>
                <Link href="/refunds" className="text-sm text-taupe hover:text-ivory">
                  Refund policy
                </Link>
              </li>
              <li>
                <Link href="/guarantee" className="text-sm text-taupe hover:text-ivory">
                  Guarantee terms
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>
      <div className="border-t border-bronze px-5 py-5 text-xs leading-relaxed text-taupe md:px-8">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-2 sm:flex-row">
          <p>© {new Date().getFullYear()} Karman</p>
          <p>
            SAT® is a registered trademark of College Board, which is not affiliated with Karman.
          </p>
        </div>
      </div>
    </footer>
  );
}
