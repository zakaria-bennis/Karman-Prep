// Cookie Policy (design rule 32). Every cookie and browser-storage key the site uses, by name, from the
// code that sets it: the consent cookie (src/lib/consent), Clerk's sign-in cookies, Stripe's checkout
// cookies, and the localStorage keys in ShellBehaviour, live/motion.ts and ThemeProvider.
import SitePage from "@/components/site/SitePage";
import { pageMeta } from "@/components/site/meta";
import { ROUTES } from "@/components/site/routes";
import { CONTACT } from "@/lib/marketing/offer";

// CONFIRM: the effective date waits on the lawyer's review of this page.
const EFFECTIVE = { iso: "2026-10-31", label: "October 31, 2026" } as const;

export const metadata = pageMeta(
  ROUTES.cookies,
  "Karman Prep: Cookie Policy",
  "Every cookie karmanprep.com uses, by name: one consent cookie, Clerk's sign-in cookies and Stripe's checkout cookies. No analytics or advertising cookies."
);

/** What the site keeps in localStorage. It stays on the device and is never sent to Karman. */
const STORAGE: [string, string][] = [
  ["karman-site-theme", "Light or dark, once you have used the switch on the website."],
  ["karman-motion", "Whether you paused the films on the home page."],
  [
    "karman-theme:*",
    "The theme chosen inside the student and parent app: one entry per account on this device, plus the last one used.",
  ],
];

export default function CookiesPage() {
  return (
    <SitePage kind="inner">
      <article className="legal">
        <header>
          <h1>Cookie Policy</h1>
          <p>
            Effective <time dateTime={EFFECTIVE.iso}>{EFFECTIVE.label}</time>. Karman sets one
            cookie of its own, plus the ones its sign-in and payment providers need. No analytics,
            no advertising, and no non-essential cookie without asking first.
          </p>
        </header>

        <section id="karman">
          <h2>The cookie Karman sets</h2>
          <h3>karman_replay_consent</h3>
          <p>
            Set only when you answer the session-recording question with Allow or Decline. It holds
            that one answer, yes or no, and stays until you clear your browser&apos;s cookies, so
            you are never asked twice. The question appears to visitors in the European Union, the
            EEA, the United Kingdom and California, and to anyone whose location cannot be told.
          </p>
          <p>
            What it controls: Sentry session replay, a recording of clicks and page text used to
            reproduce bugs. Replay is switched off for everyone today. If Karman turns it on, it
            runs only where this cookie says yes.
          </p>
        </section>

        <section id="clerk">
          <h2>Cookies from Clerk, which signs you in</h2>
          <h3>__client_uat and __session</h3>
          <p>
            Clerk sets __client_uat to record whether you are signed in and when that last changed,
            and __session, once you sign in, to keep you signed in from page to page. Clerk may add
            short-lived cookies to refresh them. Without these you cannot stay signed in.{" "}
            <a href="https://clerk.com/legal/privacy">Clerk&apos;s privacy policy</a>.
          </p>
        </section>

        <section id="stripe">
          <h2>Cookies from Stripe, which takes payments</h2>
          <h3>__stripe_mid and __stripe_sid</h3>
          <p>
            When you pay, the checkout page is run by Stripe. Stripe sets these two cookies there to
            detect fraud. They belong to Stripe and are covered by{" "}
            <a href="https://stripe.com/legal/cookies-policy">Stripe&apos;s cookie policy</a>.
          </p>
        </section>

        <section id="storage">
          <h2>What the site keeps in your browser without cookies</h2>
          <ul>
            {STORAGE.map(([key, what]) => (
              <li key={key}>
                <span>
                  <b>{key}:</b> {what}
                </span>
              </li>
            ))}
          </ul>
          <p>
            These stay on your device and are never sent to Karman. Clearing the site&apos;s data in
            your browser removes them.
          </p>
        </section>

        <section id="none">
          <h2>What Karman does not set</h2>
          <p>
            No analytics cookies, no advertising or social-media trackers, no third-party pixels.
            The site&apos;s fonts are served from karmanprep.com, not from a font service. If Karman
            ever adds a non-essential cookie, a banner asks first, and declining is as easy as
            accepting.
          </p>
        </section>

        <section id="choices">
          <h2>Your choices</h2>
          <p>
            Clearing cookies in your browser removes all of the above: you will be asked the
            session-recording question again, and signed out. Blocking Clerk&apos;s cookies means
            you cannot sign in.
          </p>
        </section>

        <section id="contact">
          <h2>Contact</h2>
          <p>
            Questions about cookies: <a href={`mailto:${CONTACT.support}`}>{CONTACT.support}</a>.
          </p>
        </section>

        <p>
          Read with the <a href={ROUTES.privacy}>Privacy Policy</a> and the{" "}
          <a href={ROUTES.terms}>Terms of Service</a>.
        </p>
      </article>
    </SitePage>
  );
}
