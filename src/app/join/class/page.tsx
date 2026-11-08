/* A student types their class code and gets a Practice plan of their own from the school. */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, Cta, Panel, PortalShell, SectionHeader } from "@/components/portal";
import { STUDENT_MENU, STUDENT_NAV } from "@/components/dashboard/StudentDashboardClient";
import { ActionMessage } from "@/components/school/SchoolShell";
import { safeAuth } from "@/lib/auth/dev-auth";
import { resolveEffectiveClerkId } from "@/lib/supabase/queries/admin";
import { createAdminClient } from "@/lib/supabase/server";
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
  const { clerkId } = await resolveEffectiveClerkId(realUserId);
  const { data: user } = await createAdminClient()
    .from("users")
    .select("first_name, email")
    .eq("clerk_id", clerkId)
    .maybeSingle();
  const { code, joined, error } = await searchParams;
  const prefill = (code ?? "").toUpperCase().slice(0, 12);

  return (
    <PortalShell
      portal="Student"
      nav={STUDENT_NAV}
      title="Join a class"
      name={(user?.first_name as string | null) ?? null}
      accountDetail={(user?.email as string | null) ?? null}
      menu={STUDENT_MENU}
      home="/dashboard/student"
    >
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
    </PortalShell>
  );
}
