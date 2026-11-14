// ============================================================
// /dev/welcome: three mockups of the welcome a student sees right after paying for a plan (founder,
// 2026-11-14: Duolingo's motion, Gusto's ease). For choosing between, not for shipping: nothing here
// saves, and production builds return 404. ?v=a the tour, ?v=b the checklist, ?v=c inside the portal.
// ============================================================

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import SitePage from "@/components/site/SitePage";
import { litFonts } from "@/components/site/home/fonts";
import { PRO_PLAN } from "@/lib/marketing/offer";
import WelcomeMock from "./WelcomeMock";
import "@/app/(site)/site-styles";
import "@/app/onboarding/intake.css";
import "./welcome.css";

export const metadata: Metadata = {
  title: "Welcome mockups (dev)",
  robots: { index: false, follow: false },
};

export default async function WelcomeDevPage({
  searchParams,
}: {
  searchParams: Promise<{ v?: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const { v } = await searchParams;
  const version = v === "b" || v === "c" ? v : "a";
  return (
    <SitePage kind="lit" bare drive="steps" className={litFonts}>
      <WelcomeMock
        version={version}
        name="Amira"
        plan={PRO_PLAN.name}
        // offer.ts speaks to the parent ("your student"); the welcome speaks to the student
        got={PRO_PLAN.includes.map((line) => line.replace("your student misses", "you miss"))}
      />
    </SitePage>
  );
}
