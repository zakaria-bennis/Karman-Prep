/*
 * Invite a parent (from the student's account menu). The student makes a link and a short
 * code and sends either however they like; the parent opens the link, or types the code in the
 * parent portal, and is linked. Nothing here describes what the parent will or will not see
 * (founder, 2026-11-07).
 */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, Cta, Panel, PortalShell, Row, SectionHeader } from "@/components/portal";
import { STUDENT_MENU, STUDENT_NAV } from "@/components/dashboard/StudentDashboardClient";
import { CopyButton } from "@/components/portal-extras/CopyButton";
import { safeAuth } from "@/lib/auth/dev-auth";
import { appUrl } from "@/lib/billing-portal/stripe";
import { currentInvite, formatLinkCode, linkedParents } from "@/lib/parent/invites";
import { resolveEffectiveClerkId } from "@/lib/supabase/queries/admin";
import { createAdminClient } from "@/lib/supabase/server";
import { createParentInviteAction } from "./actions";
import "@/components/portal-extras/forms.css";

export const metadata: Metadata = { title: "Invite a parent" };
export const dynamic = "force-dynamic";

export default async function InviteParentPage({
  searchParams,
}: {
  searchParams: Promise<{ made?: string }>;
}) {
  const { userId: realUserId } = await safeAuth();
  if (!realUserId) redirect("/auth/sign-in");
  const { clerkId } = await resolveEffectiveClerkId(realUserId);
  const { data: user } = await createAdminClient()
    .from("users")
    .select("id, first_name, email, role")
    .eq("clerk_id", clerkId)
    .maybeSingle();
  if (!user || user.role !== "student") redirect("/dashboard/student");
  const [{ made }, invite, parents] = await Promise.all([
    searchParams,
    currentInvite(user.id as string),
    linkedParents(user.id as string),
  ]);
  const link = invite ? `${appUrl()}/join/parent/${invite.token}` : null;
  const expires = invite
    ? new Date(invite.expiresAt).toLocaleDateString("en-US", { month: "long", day: "numeric" })
    : null;

  return (
    <PortalShell
      portal="Student"
      nav={STUDENT_NAV}
      title="Invite a parent"
      name={(user.first_name as string | null) ?? null}
      accountDetail={(user.email as string | null) ?? null}
      menu={STUDENT_MENU}
      home="/dashboard/student"
    >
      <Panel>
        <section aria-labelledby="invite-main">
          <h2 className="kp-title" id="invite-main">
            {link ? "Send this to your parent" : "Make a link for your parent"}
          </h2>
          {link ? (
            <>
              <p className="kp-linkbox">{link}</p>
              <div className="kp-copyline">
                <CopyButton text={link} label="Copy link" />
              </div>
              <p className="kp-meta">Or they type this code in their parent account:</p>
              <p className="kp-code" aria-label={`Code ${invite?.code.split("").join(" ")}`}>
                {invite ? formatLinkCode(invite.code) : null}
              </p>
              <p className="kp-meta">
                {made ? "New link made. " : ""}The link and code work once and last until {expires}.
              </p>
              <form action={createParentInviteAction}>
                <button type="submit" className="kp-textbtn">
                  Make a new link and code
                </button>
              </form>
            </>
          ) : (
            <>
              <p className="kp-meta">
                Your parent opens it, or types its code, to link their account to yours.
              </p>
              <form action={createParentInviteAction}>
                <Cta type="submit">Make the link</Cta>
              </form>
            </>
          )}
        </section>
        <Card>
          <SectionHeader title="Linked parents" />
          {parents.length ? (
            parents.map((p) => <Row key={p} title={p} right="Linked" />)
          ) : (
            <p className="kp-meta">No one yet.</p>
          )}
        </Card>
      </Panel>
    </PortalShell>
  );
}
