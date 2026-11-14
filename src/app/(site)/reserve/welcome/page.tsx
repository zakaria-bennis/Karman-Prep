import SitePage from "@/components/site/SitePage";
import { litFonts } from "@/components/site/home/fonts";
import { Btn } from "@/components/site/parts";
import { ROUTES } from "@/components/site/routes";
import { RESERVE } from "@/lib/marketing/reserve-copy";
import RegistrationFlight from "@/components/site/reserve/RegistrationFlight";
import { findReservation, referenceOf } from "@/lib/reserve/service";
import "@/app/onboarding/intake.css";

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
  const next = (
    <>
      <p className="rs-ref">
        {W.reference} <b className="num">{seat ? referenceOf(seat.id) : ""}</b>
      </p>
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
      <p className="rs-why">{W.help}</p>
    </>
  );

  // Paid: the questions that get the student started come first, as a flight (asked after payment on
  // purpose), unless they are already answered; then the next steps and the account.
  if (paid && seat)
    return (
      <SitePage kind="lit" bare drive="steps" className={litFonts}>
        {seat.registered_at ? (
          <div className="ob">
            <div className="ob-in">
              <div className="ob-card rs-done" data-paid>
                <h1>{W.paidTitle}</h1>
                <p className="rs-note">{W.paidText}</p>
                {next}
              </div>
            </div>
          </div>
        ) : (
          <RegistrationFlight token={token} name={seat.student_first_name ?? "your student"}>
            {next}
          </RegistrationFlight>
        )}
      </SitePage>
    );

  return (
    <SitePage kind="lit" route={[0.3, 0.42]} className={litFonts}>
      <section className="pg-hero gq rs-page" id="top">
        <div className="mist" aria-hidden="true" />
        <div className="rs gq-card rs-done">
          {/* payment can take a few seconds to reach us: look again until it has */}
          {seat ? <meta httpEquiv="refresh" content="4" /> : null}
          <h1>{seat ? W.waitTitle : W.lostTitle}</h1>
          <p className="rs-note">{seat ? W.waitText : W.lostText}</p>
        </div>
      </section>
    </SitePage>
  );
}
