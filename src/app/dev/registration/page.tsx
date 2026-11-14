// ============================================================
// /dev/registration: a dev-only page showing the registration flight a family sees right after paying
// (RegistrationFlight), with a made-up student and no saved seat, so its look and its steps can be checked
// on phone and desktop without a payment. Its last step cannot save here. Production builds return 404
// (NODE_ENV is fixed at build time).
// ============================================================

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import SitePage from "@/components/site/SitePage";
import { litFonts } from "@/components/site/home/fonts";
import RegistrationFlight from "@/components/site/reserve/RegistrationFlight";
import "@/app/(site)/site-styles";
import "@/app/onboarding/intake.css";

export const metadata: Metadata = {
  title: "Registration flight (dev)",
  robots: { index: false, follow: false },
};

export default function RegistrationDevPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <SitePage kind="lit" bare drive="steps" className={litFonts}>
      <RegistrationFlight token="00000000-0000-4000-8000-000000000000" name="Amira">
        <p className="rs-note">The next steps and the account button appear here.</p>
      </RegistrationFlight>
    </SitePage>
  );
}
