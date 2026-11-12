// The Cookie Policy (founder, 8 November): what karmanprep.com keeps in a visitor's browser, in the
// short plain style of the first-pass draft (.impeccable/mocks/fresh/morning/cookies.html), written to
// match what the site really stores. Update it whenever a cookie or storage key is added.
import SitePage from "@/components/site/SitePage";
import { litFonts } from "@/components/site/home/fonts";
import { pageMeta } from "@/components/site/meta";
import { ROUTES } from "@/components/site/routes";
import { CONTACT } from "@/lib/marketing/offer";
import { CONSENT_COOKIE } from "@/lib/consent/server";
import ConsentChoice from "@/components/consent/ConsentChoice";

export const metadata = pageMeta(
  ROUTES.cookies,
  "Karman Prep: Cookie Policy",
  "The cookies and browser storage karmanprep.com uses: sign-in, your consent choice, counting visits and your display settings. No advertising cookies."
);

const COOKIES: [string, string][] = [
  [
    "__session, __client_uat and other __clerk cookies",
    "Keep you signed in. Set by Clerk, the service that runs Karman's sign-in, on karmanprep.com. Needed for the account to work.",
  ],
  [
    CONSENT_COOKIE,
    "Remembers your choice in the cookie note: Allow all (we count visits and may replay a session to fix bugs) or Essentials only. Kept so we don't ask again.",
  ],
];

const STORAGE: [string, string][] = [
  [
    "karman-aid",
    "A random id for this device, so we can count visits. Set only after Allow all on the website, or when you sign in.",
  ],
  ["karman-visit", "A random id for the current visit and when it was last active."],
  ["karman-site-theme", "Your light or dark choice on the website, if you picked one."],
  ["karman-motion", "Whether you paused the film on the home page."],
  [
    "karman-theme and the calculator and quiz settings",
    "Your display, calculator and sound settings inside your account.",
  ],
];

function Table({ rows }: { rows: [string, string][] }) {
  return (
    <dl>
      {rows.map(([name, what]) => (
        <div key={name}>
          <dt>
            <code>{name}</code>
          </dt>
          <dd>{what}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function CookiesPage() {
  return (
    <SitePage kind="lit" route={[0.9, 1]} className={`${litFonts} relit rl-legal`}>
      <article className="legal">
        <header>
          <div>
            <h1>Cookie Policy</h1>
            <p>
              karmanprep.com uses a few cookies and small notes in your browser&apos;s own storage.
              None are for advertising, and nothing is shared with outside analytics or advertising
              companies. Questions: <a href={`mailto:${CONTACT.general}`}>{CONTACT.general}</a>.
            </p>
          </div>
        </header>

        <div>
          <section>
            <h2>Cookies</h2>
            <Table rows={COOKIES} />
            <p>
              Payments happen on Stripe&apos;s own checkout pages, which set Stripe&apos;s cookies
              there under Stripe&apos;s policy, not on karmanprep.com.
            </p>
          </section>

          <section>
            <h2>Browser storage</h2>
            <p>
              These stay on your device. Only the two visit ids are ever sent to Karman, with the
              visit records they label.
            </p>
            <Table rows={STORAGE} />
          </section>

          <section>
            <h2>Your choices</h2>
            <p>
              Clearing your browser&apos;s site data removes all of them. Removing the sign-in
              cookies signs you out. Counting visits and session recording stay off on the website
              unless you allow them, and Do Not Track or Global Privacy Control turns counting off.
              Inside your account, practice and usage are recorded because the product needs them.
              Change your website choice here at any time:
            </p>
            <ConsentChoice />
            <p>
              More on how we handle your information: <a href={ROUTES.privacy}>Privacy Policy</a>.
            </p>
          </section>
        </div>
      </article>
    </SitePage>
  );
}
