// ============================================================
// /admin — Dark-themed role-gated (admin only) layout.
// ============================================================

import { safeAuth } from "@/lib/auth/dev-auth";
import { redirect } from "next/navigation";
import { ThemedUserButton as UserButton } from "@/components/shared/ThemedClerkWidgets";
import PortalShell from "@/components/shared/PortalShell";
import { fetchUserRole } from "@/lib/supabase/queries/admin";
import ImpersonationMenu from "@/components/admin/ImpersonationMenu";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await safeAuth();
  if (!userId) redirect("/auth/sign-in");

  const role = await fetchUserRole(userId);
  if (role !== "admin") redirect("/dashboard/student");

  return (
    <PortalShell
      area="admin"
      actions={
        <>
          <ImpersonationMenu />
          <UserButton />
        </>
      }
    >
      {children}
    </PortalShell>
  );
}
