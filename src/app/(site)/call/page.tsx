import SitePage from "@/components/site/SitePage";
import { litFonts } from "@/components/site/home/fonts";
import CallForm, { type CallMe } from "@/components/site/private/CallForm";
import { callWords } from "@/components/site/private/PrivateSections";
import { CALL_MINUTES } from "@/lib/marketing/offer";
import { section } from "@/lib/marketing/site-copy";
import { reserveProfile } from "@/lib/reserve/buyer";

export const metadata = {
  title: `Karman Prep: Book a free ${CALL_MINUTES}-minute call`,
  robots: { index: false },
};
// the date is read per request, so the calendar always starts from today
export const dynamic = "force-dynamic";

/** Booking a free call, by itself: where the plan-finder sends a student whose plan is private tutoring.
 *  The same form as the one that closes the Private tutoring page, with nothing else around it. */
export default async function CallPage() {
  const today = new Date().toISOString().slice(0, 10);
  // a signed-in visitor (the plan-finder sends them here with an account) is not asked their name and
  // email again (founder, 2026-11-25); a visitor without an account gets the empty form
  const account = await reserveProfile().catch(() => null);
  const me: CallMe | null = account
    ? {
        first: account.firstName,
        last: account.fullName.slice(account.firstName.length).trim(),
        email: account.email,
      }
    : null;
  return (
    <SitePage kind="lit" noTheme route={[0.5, 0.56]} className={litFonts}>
      <section className="sect pg-sect pg-end pv-close pv-alone" id="top" aria-labelledby="call-h">
        <div className="mist" aria-hidden="true" />
        <div className="pg-in">
          <h1 id="call-h">{section(36).headline}</h1>
          <CallForm today={today} w={callWords()} me={me} />
        </div>
      </section>
    </SitePage>
  );
}
