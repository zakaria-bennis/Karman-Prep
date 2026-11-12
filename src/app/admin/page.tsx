// ============================================================
// /admin — the admin home: what needs a decision now, and a
// link to every admin tool (the tab bar only holds six).
// ============================================================

import type { Metadata } from "next";
import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/server";
import ImpersonationMenu from "@/components/admin/ImpersonationMenu";
import { WbPage, WbSection, WbStats } from "@/components/admin/workbench";

export const metadata: Metadata = { title: "Admin | Karman" };
export const dynamic = "force-dynamic";

async function countRows(table: string, filter?: [string, string]): Promise<number | null> {
  const db = createAdminClient() as unknown as SupabaseClient;
  let q = db.from(table).select("*", { count: "exact", head: true });
  if (filter) q = q.eq(filter[0], filter[1]);
  const { count, error } = await q;
  return error ? null : (count ?? 0);
}

const TOOLS: Array<{ title: string; links: Array<[string, string]> }> = [
  {
    title: "People and money",
    links: [
      ["/admin/messages", "Messages from families"],
      ["/admin/crm", "CRM: every lead, family, school and tutor"],
      ["/admin/users", "People and roles"],
      ["/admin/students", "Students, as their tutor sees them"],
      ["/admin/tutors", "Tutors and their students"],
      ["/admin/plans", "Plans and subscriptions"],
      ["/admin/affiliates", "Affiliate tutors"],
      ["/admin/schools", "Schools"],
      ["/admin/revenue", "Revenue"],
      ["/admin/analytics", "Analytics: visits, sign-up funnel, student engagement"],
    ],
  },
  {
    title: "Programs",
    links: [
      ["/admin/cohorts", "Cohorts"],
      ["/admin/scholarship", "Scholarship review"],
      ["/admin/moderation", "Chat moderation"],
    ],
  },
  {
    title: "Questions",
    links: [
      ["/admin/bank", "Question bank (read only)"],
      ["/admin/questions/dashboard", "Question overview"],
      ["/admin/questions/review", "Review questions"],
      ["/admin/questions/preview", "Question preview"],
      ["/admin/questions/preview/rapid", "Rapid student view"],
      ["/admin/questions/import", "Import questions"],
      ["/admin/curriculum", "Curriculum"],
    ],
  },
  {
    title: "Operations",
    links: [
      ["/admin/jobs", "Background jobs"],
      ["/admin/pdf-pipeline/jobs", "Import jobs"],
    ],
  },
];

function show(n: number | null): string {
  return n === null ? "—" : n.toLocaleString("en-US");
}

export default async function AdminHomePage() {
  const [messages, claims, flags, students, cohorts] = await Promise.all([
    countRows("family_messages", ["status", "open"]),
    countRows("scholarship_claims", ["status", "submitted"]),
    countRows("question_import_flags", ["status", "open"]),
    countRows("users", ["role", "student"]),
    countRows("cohorts", ["status", "active"]),
  ]);

  return (
    <WbPage
      title="Today"
      summary="What needs a decision, and every admin tool."
      actions={
        messages ? (
          <Link className="wb-btn" data-variant="primary" href="/admin/messages">
            Answer {messages} family {messages === 1 ? "message" : "messages"}
          </Link>
        ) : claims ? (
          <Link className="wb-btn" data-variant="primary" href="/admin/scholarship">
            Review {claims} scholarship {claims === 1 ? "claim" : "claims"}
          </Link>
        ) : undefined
      }
    >
      <WbStats
        items={[
          { label: "Family messages waiting", value: show(messages) },
          { label: "Scholarship claims to review", value: show(claims) },
          { label: "Questions flagged for import", value: show(flags) },
          { label: "Students", value: show(students) },
          { label: "Active cohorts", value: show(cohorts) },
        ]}
      />
      <div className="wb-grid" data-columns="2">
        {TOOLS.map((group) => (
          <WbSection key={group.title} title={group.title}>
            <ul className="wb-timeline">
              {group.links.map(([href, label]) => (
                <li key={href}>
                  <Link className="kp-link" href={href}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </WbSection>
        ))}
        <WbSection title="See the app as someone else">
          <p className="wb-note">
            Preview a student, parent or tutor screen without changing data.
          </p>
          <ImpersonationMenu />
        </WbSection>
      </div>
    </WbPage>
  );
}
