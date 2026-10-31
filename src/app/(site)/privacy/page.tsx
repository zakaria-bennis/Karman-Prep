// Privacy Policy. A plain description of what Karman collects, what it is for, who else handles it, and
// what a family can ask for. The third parties are the services the code actually calls (see
// src/lib/integrations and the root layout), named one by one. Lines the lawyer still has to settle are
// marked CONFIRM.
import SitePage from "@/components/site/SitePage";
import { pageMeta } from "@/components/site/meta";
import { ROUTES } from "@/components/site/routes";
import { CONTACT, GUARANTEE as G } from "@/lib/marketing/offer";

// CONFIRM: the effective date waits on the lawyer's review of this page.
const EFFECTIVE = { iso: "2026-10-31", label: "October 31, 2026" } as const;
// CONFIRM: the notice period before a material change, kept from the previous policy.
const CHANGE_NOTICE_DAYS = 14;
// CONFIRM: retention. The page promises deletion on request and keeps payment records as the law requires;
// the previous policy's "90 days after cancellation" is not carried over because nothing enforces it.

/** The cookie the consent banner writes (src/lib/consent/server.ts). */
const CONSENT_COOKIE = "karman_replay_consent";

export const metadata = pageMeta(
  ROUTES.privacy,
  "Karman Prep: Privacy Policy",
  "What Karman collects about a student and a parent, what it is for, which services handle it, and what you can ask for. Never used for marketing."
);

type Processor = { name: string; does: string; href: string };

/** Every service that touches personal data, from the code that calls it. */
const PROCESSORS: Processor[] = [
  {
    name: "Clerk",
    does: "Signs you in and stores passwords.",
    href: "https://clerk.com/legal/privacy",
  },
  { name: "Stripe", does: "Takes every payment.", href: "https://stripe.com/privacy" },
  { name: "Supabase", does: "Holds the database.", href: "https://supabase.com/privacy" },
  {
    name: "Cloudflare",
    does: "Hosts the site and serves every page.",
    href: "https://www.cloudflare.com/privacypolicy/",
  },
  {
    name: "Resend",
    does: "Sends Karman's email.",
    href: "https://resend.com/legal/privacy-policy",
  },
  { name: "Sentry", does: "Receives error reports.", href: "https://sentry.io/privacy/" },
  {
    name: "Zoom",
    does: "Runs the live classes, sessions and the free practice test.",
    href: "https://www.zoom.com/en/trust/privacy/",
  },
  { name: "Cal.com", does: "Books sessions and calls.", href: "https://cal.com/privacy" },
  {
    name: "Fireflies",
    does: "Transcribes Private sessions on Zoom.",
    href: "https://fireflies.ai/privacy-policy",
  },
  {
    name: "OpenAI",
    does: "Drafts the tutor's note to parents from a session transcript, and checks chat messages for safety.",
    href: "https://openai.com/policies/privacy-policy/",
  },
  {
    name: "Slack",
    does: "Carries the cohort chat. Students never need a Slack account; their messages pass through Slack's servers.",
    href: "https://slack.com/trust/privacy/privacy-policy",
  },
];

function Mail({ to }: { to: string }) {
  return <a href={`mailto:${to}`}>{to}</a>;
}

export default function PrivacyPage() {
  return (
    <SitePage kind="inner">
      <article className="legal">
        <header>
          <h1>Privacy Policy</h1>
          <p>
            Effective <time dateTime={EFFECTIVE.iso}>{EFFECTIVE.label}</time>. What Karman collects,
            what it is for, who else handles it, and what you can ask us to do. Student data runs
            the program. It is never used for marketing.
          </p>
        </header>

        <section id="collected">
          <h2>What Karman collects</h2>
          <h3>Your account</h3>
          <p>
            Name, email address and role: student, parent, tutor or school staff. For a student, the
            SAT date and the score they are aiming for, when you give them. Clerk stores passwords;
            Karman never sees them.
          </p>
          <h3>Study data</h3>
          <p>
            Every answer a student gives and whether it was right. Scores on the diagnostic and on
            practice tests, and the Karman predicted score. Progress by skill, streaks and rewards.
            Attendance at live classes and sessions. Messages in the cohort chat and to tutors, and
            the notes tutors write. For Private sessions, the transcript the tutor uses to write the
            note to parents.
          </p>
          <h3>Score reports</h3>
          <p>
            An official SAT or PSAT score report you send Karman, to set the baseline for the
            guarantee or to claim it, is private student data. Karman uses it for that purpose only,
            and only the tutor and the Karman staff handling it can see it.
          </p>
          <h3>Parent links</h3>
          <p>
            A parent account is linked to the student&apos;s. The parent sees progress, attendance,
            scores and tutor notes, and gets the weekly update. Tutors see the students they teach.
          </p>
          <h3>Payments</h3>
          <p>
            Stripe takes every payment. Karman keeps your Stripe customer number, what you bought
            and whether it is paid. It never has your card number.
          </p>
          <h3>Requests from the website</h3>
          <p>
            When you apply for the SAT Program, book the free practice test or ask to hear about a
            plan, Karman keeps your email address, the scores you enter and what you asked for.
          </p>
          <h3>Email</h3>
          <p>
            Resend delivers account email, receipts, reminders and the weekly parent update.
            Marketing email goes only to people who asked for it, and every one has an unsubscribe
            link.
          </p>
          <h3>Errors and technical data</h3>
          <p>
            When something breaks, Sentry receives a report: the page, the error and the browser,
            with no personal details attached. Session replay, a recording of clicks and page text
            used to reproduce bugs, is switched off for everyone. If Karman turns it on, it runs
            only for visitors who clicked Allow on the consent banner; that answer lives in the{" "}
            {CONSENT_COOKIE} cookie. Cloudflare, which hosts the site, sees your IP address and
            country. Karman uses the country only to decide whether to show the consent banner.
          </p>
        </section>

        <section id="purpose">
          <h2>What it is for</h2>
          <ul>
            <li>
              <span>
                Running the plan you bought, and showing the student what to practise next.
              </span>
            </li>
            <li>
              <span>Showing parents and tutors how the student is doing.</span>
            </li>
            <li>
              <span>Letting the tutor write the note to parents after a session.</span>
            </li>
            <li>
              <span>Sending the email you expect: receipts, reminders and updates.</span>
            </li>
            <li>
              <span>Taking payments and deciding guarantee claims.</span>
            </li>
            <li>
              <span>Finding and fixing bugs.</span>
            </li>
            <li>
              <span>Meeting legal obligations.</span>
            </li>
          </ul>
        </section>

        <section id="never">
          <h2>What Karman never does</h2>
          <ul>
            <li>
              <span>Sell personal information.</span>
            </li>
            <li>
              <span>Use a student&apos;s data for advertising or marketing.</span>
            </li>
            <li>
              <span>Show ads.</span>
            </li>
            <li>
              <span>Share data with anyone not named on this page.</span>
            </li>
          </ul>
        </section>

        <section id="processors">
          <h2>Who else handles your data</h2>
          <p>
            Each of these services does one job for Karman and is bound by its own privacy policy.
          </p>
          {PROCESSORS.map((s) => (
            <div key={s.name}>
              <h3>{s.name}</h3>
              <p>
                {s.does} <a href={s.href}>Privacy policy</a>.
              </p>
            </div>
          ))}
        </section>

        <section id="cookies">
          <h2>Cookies</h2>
          <p>
            Karman sets one cookie of its own, {CONSENT_COOKIE}, to remember your answer to the
            session-recording question. Clerk sets the cookies that keep you signed in, and Stripe
            sets its own on its checkout page. There are no analytics or advertising cookies, and
            nothing non-essential is set without asking first. The{" "}
            <a href={ROUTES.cookies}>Cookie Policy</a> lists each one, and what the site keeps in
            your browser&apos;s storage.
          </p>
        </section>

        <section id="retention">
          <h2>How long Karman keeps it</h2>
          <p>
            As long as the account is open. Ask Karman to delete the account and it is deleted, with
            its study data. Payment records stay as long as tax and accounting law requires.
          </p>
        </section>

        <section id="children">
          <h2>Children</h2>
          <p>
            Karman is for students 13 and older. A student under 18 uses it with a parent or
            guardian&apos;s permission. If a child under 13 has made an account, email{" "}
            <Mail to={CONTACT.support} /> and Karman deletes it.
          </p>
        </section>

        <section id="rights">
          <h2>Your rights, including in California</h2>
          <p>Anyone can ask Karman to:</p>
          <ul>
            <li>
              <span>Show the data it holds about you or your student.</span>
            </li>
            <li>
              <span>Correct it.</span>
            </li>
            <li>
              <span>Delete it.</span>
            </li>
            <li>
              <span>Send a copy in a file you can use.</span>
            </li>
            <li>
              <span>Stop marketing email.</span>
            </li>
          </ul>
          <p>
            California residents also have the right to know what is collected and why (this page),
            the right to know that Karman does not sell or share personal information for
            advertising, and the right to the same service whether or not they use these rights.
          </p>
          <p>
            To ask, email <Mail to={CONTACT.support} /> from the address on the account. Karman
            replies to that address to check it is you. A parent can ask on a student&apos;s behalf.
          </p>
        </section>

        <section id="security">
          <h2>Security</h2>
          <p>
            Every page is served over HTTPS. The database is encrypted at rest, and its access rules
            mean a student sees only their own data, a parent only their linked student, and a tutor
            only their students. Clerk handles passwords. No system is perfect: if you think an
            account has been used by someone else, email <Mail to={CONTACT.support} /> at once.
          </p>
        </section>

        <section id="changes">
          <h2>Changes to this policy</h2>
          <p>
            Account holders get an email at least {CHANGE_NOTICE_DAYS} days before a material change
            takes effect. The date at the top is the version you are reading.
          </p>
        </section>

        <section id="contact">
          <h2>Contact</h2>
          <p>
            Privacy requests: <Mail to={CONTACT.support} />. Anything else:{" "}
            <Mail to={CONTACT.general} />. Guarantee claims and the score reports that go with them:{" "}
            <Mail to={G.claimEmail} />.
          </p>
        </section>

        <p>
          Read with the <a href={ROUTES.terms}>Terms of Service</a> and the{" "}
          <a href={ROUTES.cookies}>Cookie Policy</a>.
        </p>
      </article>
    </SitePage>
  );
}
