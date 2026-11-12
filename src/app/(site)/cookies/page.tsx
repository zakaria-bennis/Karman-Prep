// The Cookie Policy (founder, 8 November): what karmanprep.com keeps in a visitor's browser, in the
// short plain style of the first-pass draft (.impeccable/mocks/fresh/morning/cookies.html), written to
// match what the site really stores. Update it whenever a cookie or storage key is added.
import SitePage from "@/components/site/SitePage";
import { litFonts } from "@/components/site/home/fonts";
import { pageMeta } from "@/components/site/meta";
import { ROUTES } from "@/components/site/routes";
import { CONTACT } from "@/lib/marketing/offer";
import { CONSENT_COOKIE } from "@/lib/consent/server";

export const metadata = pageMeta(
  ROUTES.cookies,
  "Karman Prep: Cookie Policy",
  "The cookies and browser storage karmanprep.com uses: sign-in, your consent choice and your display settings. No advertising cookies."
);

const COOKIES: [string, string][] = [
  [
    "__session, __client_uat and other __clerk cookies",
    "Keep you signed in. Set by Clerk, the service that runs Karman's sign-in, on karmanprep.com. Needed for the account to work.",
  ],
  [
    CONSENT_COOKIE,
    "Remembers whether you allowed or declined session recording for fixing bugs, so we don't ask again.",
  ],
];

const STORAGE: [string, string][] = [
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
              None are for advertising, and no analytics cookies are set. Questions:{" "}
              <a href={`mailto:${CONTACT.general}`}>{CONTACT.general}</a>.
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
            <p>These stay on your device. Karman never reads them from its servers.</p>
            <Table rows={STORAGE} />
          </section>

          <section>
            <h2>Your choices</h2>
            <p>
              Clearing your browser&apos;s site data removes all of them. Removing the sign-in
              cookies signs you out. Session recording stays off unless you allow it, and you can
              change that choice from the banner or by writing to us.
            </p>
            <p>
              More on how we handle your information: <a href={ROUTES.privacy}>Privacy Policy</a>.
            </p>
          </section>
        </div>
      </article>
    </SitePage>
  );
}
