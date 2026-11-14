import SitePage from "@/components/site/SitePage";
import { litFonts } from "@/components/site/home/fonts";
import { Btn } from "@/components/site/parts";
import { ROUTES } from "@/components/site/routes";
import { RESERVE } from "@/lib/marketing/reserve-copy";
import { findReservation } from "@/lib/reserve/service";

export const metadata = { title: "Karman Prep: Your seat", robots: { index: false } };
export const dynamic = "force-dynamic";

const W = RESERVE.welcome;

/** Where a family lands after paying, and where the link in their confirmation email leads: what happens
 *  next, and the button that creates the student's account with the paid seat attached. */
export default async function ReserveWelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ r?: string }>;
}) {
  const { r: token = "" } = await searchParams;
  const seat = await findReservation(token);
  const paid = seat?.status === "paid" || seat?.status === "placed";
  const claim = `/reserve/claim?r=${encodeURIComponent(token)}`;
  return (
    <SitePage kind="lit" route={[0.3, 0.42]} className={litFonts}>
      <section className="pg-hero gq rs-page" id="top">
        <div className="mist" aria-hidden="true" />
        <div className="rs gq-card rs-done" data-paid={paid || undefined}>
          {/* payment can take a few seconds to reach us: look again until it has */}
          {seat && !paid ? <meta httpEquiv="refresh" content="4" /> : null}
          {paid ? <i className="rs-confetti" aria-hidden="true" /> : null}
          <h1>{!seat ? W.lostTitle : paid ? W.paidTitle : W.waitTitle}</h1>
          <p className="rs-note">{!seat ? W.lostText : paid ? W.paidText : W.waitText}</p>
          {paid ? (
            <>
              <ol className="rs-next">
                {W.steps.map(([name, line], i) => (
                  <li key={name}>
                    <b className="num">{i + 1}</b>
                    <div>
                      <h2>{name}</h2>
                      <p>{line}</p>
                    </div>
                  </li>
                ))}
              </ol>
              {seat?.clerk_user_id ? (
                <>
                  <p className="rs-note">{W.claimed}</p>
                  <Btn label={W.signIn} href={ROUTES.signIn} />
                </>
              ) : (
                <Btn label={W.button} href={claim} />
              )}
            </>
          ) : null}
        </div>
      </section>
    </SitePage>
  );
}
