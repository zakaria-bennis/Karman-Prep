/* A parent opens a student's invite link, signed in, and accepts it. */
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, Cta, Panel, PortalShell, SectionHeader } from "@/components/portal";
import { SwitchAccount } from "@/components/parent/SwitchAccount";
import { ActionMessage } from "@/components/school/SchoolShell";
import { safeAuth } from "@/lib/auth/dev-auth";
import { lookupInvite } from "@/lib/parent/invites";
import { resolveEffectiveClerkId } from "@/lib/supabase/queries/admin";
import { untypedAdmin } from "@/lib/school/db";
import { acceptParentInviteAction } from "./actions";
import "@/components/portal-extras/forms.css";

export const metadata: Metadata = { title: "Parent invite" };
export const dynamic = "force-dynamic";

const USED = "This link was already used or has expired. Ask for a new one.";

export default async function JoinParentPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ token }, { error }] = await Promise.all([params, searchParams]);
  const { userId: realUserId } = await safeAuth();
  if (!realUserId) redirect(`/auth/sign-in?redirect_url=/join/parent/${encodeURIComponent(token)}`);
  const { clerkId } = await resolveEffectiveClerkId(realUserId);
  const supabase = untypedAdmin();
  const [{ data: me }, invite] = await Promise.all([
    supabase.from("users").select("first_name, email").eq("clerk_id", clerkId).maybeSingle(),
    lookupInvite({ token }, supabase),
  ]);
  // The student opened their own invite: nothing to accept, and their account stays a student's.
  const own = invite.state === "open" && invite.student.clerkId === clerkId;

  return (
    <PortalShell
      portal="Parent"
      nav={[{ href: "/dashboard/parent", label: "Parent portal", icon: "child" }]}
      title="Parent invite"
      name={(me?.first_name as string | null) ?? null}
      accountDetail={(me?.email as string | null) ?? null}
      home="/dashboard/parent"
    >
      <Panel>
        <ActionMessage error={error === "invite" ? USED : undefined} />
        {own ? (
          <Card>
            <SectionHeader title="This is your own invite" />
            <p className="kp-meta">
              Send this link to your parent. They open it signed in to their own account.
            </p>
            <Link className="kp-link" href="/dashboard/student">
              Back to your portal
            </Link>
          </Card>
        ) : invite.state === "open" && error === "role" ? (
          <Card>
            <SectionHeader title="Use a parent account" />
            <p className="kp-meta">
              This account is already a student or tutor account. A parent needs an account of their
              own to follow {invite.student.firstName}.
            </p>
            <SwitchAccount backTo={`/join/parent/${token}`} />
          </Card>
        ) : invite.state === "open" ? (
          <section aria-labelledby="invite-main">
            <h2 className="kp-title" id="invite-main">
              Link your account to {invite.student.firstName}
            </h2>
            <p className="kp-meta">
              You will see {invite.student.firstName}&rsquo;s week, progress, sessions and billing
              in the parent portal.
            </p>
            <form action={acceptParentInviteAction}>
              <input type="hidden" name="token" value={token} />
              <Cta type="submit">Accept and link</Cta>
            </form>
          </section>
        ) : (
          <Card>
            <SectionHeader
              title={
                invite.state === "used" ? "This link was already used" : "This link doesn't work"
              }
            />
            <p className="kp-meta">
              {invite.state === "used"
                ? "If it was you, your student is already in your parent portal."
                : "It may have expired. Ask your student to make a new one from Invite a parent."}
            </p>
            <Link className="kp-link" href="/dashboard/parent">
              Open the parent portal
            </Link>
          </Card>
        )}
      </Panel>
    </PortalShell>
  );
}
