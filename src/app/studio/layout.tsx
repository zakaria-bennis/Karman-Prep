// /studio: the Page Studio, for the founder (admins) only. Full screen, outside the admin shell, so
// the page being reviewed gets all the room. Every action checks the admin role again on its own.
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { adminOrNull } from "@/lib/auth/admin-guard";
import { safeAuth } from "@/lib/auth/dev-auth";

export const metadata: Metadata = {
  title: "Page Studio",
  robots: { index: false, follow: false },
};

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await safeAuth();
  if (!userId) redirect("/auth/sign-in");
  if (!(await adminOrNull())) redirect("/");
  return (
    <>
      {/* The studio shows who you're viewing as in its own bar. */}
      <style>{"[data-impersonation-banner]{display:none!important}"}</style>
      {children}
    </>
  );
}
