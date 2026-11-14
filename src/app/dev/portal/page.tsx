// ============================================================
// /dev/portal: mockups of the student portal rebuilt from scratch (founder, 2026-11-14), starting with
// the menu and the Library. For choosing between, not for shipping: the skills are the real catalogue,
// the levels are made up, and nothing saves. Production builds return 404.
// ?v=a shelves, ?v=b ladder, ?v=c board. ?plan=pro (default) or cohort changes the menu.
// ============================================================

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { buildCourse } from "@/lib/student/course";
import PortalMock, { type MockSection } from "./PortalMock";

export const metadata: Metadata = {
  title: "Portal mockups (dev)",
  robots: { index: false, follow: false },
};

/** A made-up level from 0 to 3 for each skill, steady between loads, so the mockup shows every state. */
function sampleLevel(id: string, i: number): number {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return i < 3
    ? 3 - (h % 2)
    : h % 4 === 0
      ? 0
      : (h % 3) + (i % 2 === 0 ? 0 : 1) > 3
        ? 3
        : (h + i) % 4;
}

function section(subject: "math" | "reading"): MockSection {
  const course = buildCourse(subject, new Map());
  let n = 0;
  return {
    id: subject,
    name: course.name,
    domains: course.domains.map((d) => ({
      id: d.id,
      name: d.label,
      groups: d.officials.map((o) => ({
        name: o.label,
        skills: o.skills.map((s) => ({ id: s.id, name: s.label, level: sampleLevel(s.id, n++) })),
      })),
    })),
  };
}

export default async function PortalDevPage({
  searchParams,
}: {
  searchParams: Promise<{ v?: string; plan?: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const q = await searchParams;
  return (
    <PortalMock
      version={q.v === "b" || q.v === "c" ? q.v : "a"}
      plan={q.plan === "cohort" ? "cohort" : "pro"}
      sections={[section("reading"), section("math")]}
    />
  );
}
