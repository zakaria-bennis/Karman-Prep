// ============================================================
// /admin/generated: generated questions (admin only; founder, 2026-11-22 round 2).
//
// The sitewide switch that hides every generated question, the live practice questions behind each
// of the 72 skills (original and generated), and the questions admins reported. Math is made on
// demand: a generated Math question is stored only when a student is served one.
// ============================================================

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { WbPage, WbStats } from "@/components/admin/workbench";
import { safeAuth } from "@/lib/auth/dev-auth";
import { loadOriginCounts } from "@/lib/generator/admin";
import { generatedHidden } from "@/lib/generator/switch";
import { SKILLS72 } from "@/lib/skills/ids72";
import { requireRole } from "@/lib/supabase/queries/admin";
import { createAdminClient } from "@/lib/supabase/server";
import HideSwitch from "./HideSwitch";

export const metadata: Metadata = { title: "Admin — Generated questions | Karman" };
export const dynamic = "force-dynamic";

type Report = { question_id: string; reason: string; created_at: string };

export default async function AdminGeneratedPage() {
  const { userId } = await safeAuth();
  if (!userId) redirect("/sign-in");
  if (!(await requireRole(userId, ["admin"]))) redirect("/");

  const db = createAdminClient() as unknown as SupabaseClient;
  const [counts, hidden, reports] = await Promise.all([
    loadOriginCounts(db),
    generatedHidden(),
    db
      .from("generated_question_reports")
      .select("question_id, reason, created_at")
      .order("created_at", { ascending: false })
      .limit(50)
      .then(
        (r) => (r.data ?? []) as Report[],
        () => [] as Report[]
      ),
  ]);
  const totals = Object.values(counts).reduce(
    (t, c) => ({ original: t.original + c.original, generated: t.generated + c.generated }),
    { original: 0, generated: 0 }
  );

  return (
    <WbPage
      title="Generated questions"
      summary="Students never see which questions are generated. Math is made on demand: a question is stored only when a student is served one."
      actions={
        <Link className="wb-btn" href="/admin">
          Back to admin
        </Link>
      }
    >
      <WbStats
        items={[
          { label: "Original", value: totals.original },
          { label: "Generated", value: totals.generated },
          { label: "Reported", value: reports.length },
        ]}
      />
      <div className="wb-grid">
        <HideSwitch hidden={hidden} />

        <section className="wb-section">
          <h2>By skill</h2>
          <div className="wb-table-wrap">
            <table className="wb-table">
              <thead>
                <tr>
                  <th scope="col">Skill</th>
                  <th scope="col">Original</th>
                  <th scope="col">Generated</th>
                </tr>
              </thead>
              <tbody>
                {SKILLS72.map((skill) => (
                  <tr key={skill.id}>
                    <td>
                      {skill.name}
                      <br />
                      <small>{skill.section}</small>
                    </td>
                    <td>{(counts[skill.name]?.original ?? 0).toLocaleString("en-US")}</td>
                    <td>{(counts[skill.name]?.generated ?? 0).toLocaleString("en-US")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="wb-section">
          <h2>Reported</h2>
          {reports.length === 0 ? (
            <p className="wb-empty">No reports yet.</p>
          ) : (
            <div className="wb-table-wrap">
              <table className="wb-table">
                <thead>
                  <tr>
                    <th scope="col">When</th>
                    <th scope="col">Question</th>
                    <th scope="col">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r) => (
                    <tr key={`${r.question_id}:${r.created_at}`}>
                      <td>{new Date(r.created_at).toLocaleString("en-US")}</td>
                      <td>
                        <Link href={`/admin/bank/${r.question_id}`}>
                          {r.question_id.slice(0, 8)}
                        </Link>
                      </td>
                      <td>{r.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </WbPage>
  );
}
