import SitePage from "@/components/site/SitePage";
import { litFonts } from "@/components/site/home/fonts";
import { RESERVE } from "@/lib/marketing/reserve-copy";
import RegistrationFlight from "@/components/site/reserve/RegistrationFlight";
import { findReservation } from "@/lib/reserve/service";
import "@/app/onboarding/intake.css";

export const metadata = { title: "Karman Prep: Your seat", robots: { index: false } };
export const dynamic = "force-dynamic";

const W = RESERVE.welcome;

/** Where a family lands after paying, and where the link in their confirmation email leads: the few
 *  questions that get the student started, then the student's own link to an account with the seat attached. */
export default async function ReserveWelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ r?: string }>;
}) {
  const { r: token = "" } = await searchParams;
  const seat = await findReservation(token);
  const paid = seat?.status === "paid" || seat?.status === "placed";
  // Paid: the questions that get the student started come first, as a flight (asked after payment on
  // purpose). Once they are answered, the page opens on the landing: the student's own account link.
  if (paid && seat)
    return (
      <SitePage kind="lit" bare drive="steps" className={litFonts}>
        <RegistrationFlight
          token={token}
          parentToken={seat.parent_token}
          name={seat.student_first_name ?? "your student"}
          filledBy={seat.filled_by}
          claimed={!!seat.clerk_user_id}
          landed={!!seat.registered_at}
        />
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
