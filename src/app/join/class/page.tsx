/* A student types their class code and gets a Practice plan of their own from the school. */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, Cta, Panel, SectionHeader } from "@/components/portal";
import StudentPortal from "@/components/student-portal/StudentPortal";
import { ActionMessage } from "@/components/school/SchoolShell";
import { safeAuth } from "@/lib/auth/dev-auth";
import { loadStudentContext } from "@/lib/student/context";
import { joinClassAction } from "./actions";
import "@/components/portal-extras/forms.css";

export const metadata: Metadata = { title: "Join a class" };
export const dynamic = "force-dynamic";

export default async function JoinClassPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; joined?: string; error?: string }>;
}) {
  const { userId: realUserId } = await safeAuth();
  if (!realUserId) redirect("/auth/sign-in?redirect_url=/join/class");
  const ctx = await loadStudentContext();
  const { code, joined, error } = await searchParams;
  const prefill = (code ?? "").toUpperCase().slice(0, 12);

  return (
    <StudentPortal ctx={ctx} title="Join a class">
      <Panel>
        {joined ? (
          <section aria-labelledby="joined">
            <h2 className="kp-title" id="joined">
              You joined {joined}
            </h2>
            <p className="kp-meta">
              Your Practice plan from the school is on. Work your teacher assigns shows in your
              Homework.
            </p>
            <Cta href="/dashboard/student">Go to Today</Cta>
          </section>
        ) : (
          <Card>
            <SectionHeader title="Your class code" />
            <ActionMessage error={error} />
            <form action={joinClassAction} className="kp-form">
              <label className="kp-field">
                <span>Code from your teacher</span>
                <input
                  className="kp-input"
                  name="code"
                  required
                  maxLength={12}
                  autoComplete="off"
                  autoCapitalize="characters"
                  defaultValue={prefill}
                  placeholder="LKV3PQ"
                />
              </label>
              <div>
                <Cta type="submit">Join class</Cta>
              </div>
            </form>
          </Card>
        )}
      </Panel>
    </StudentPortal>
  );
}
