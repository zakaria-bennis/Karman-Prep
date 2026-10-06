import type { Metadata } from "next";
import { safeAuth } from "@/lib/auth/dev-auth";
import { redirect } from "next/navigation";
import { getCatalogSkills, SKILL_DOMAINS } from "@/data/curriculum/skill-catalog";
import PortalCards from "@/components/learn/PortalCards";

export const metadata: Metadata = {
  title: "Learn — Karman",
  description: "Explore 39 SAT skills across eight domains.",
};

export default async function LearnPage() {
  const { userId } = await safeAuth();
  if (!userId) redirect("/auth/sign-in");
  const count = (subject: "reading" | "math") => ({
    total: getCatalogSkills(subject).length,
    domainCount: SKILL_DOMAINS.filter((domain) => domain.subject === subject).length,
  });
  return <PortalCards readingStats={count("reading")} mathStats={count("math")} />;
}
