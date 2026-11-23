// /dev/shell: the rebuilt student portal. Signed in as a student it shows their own data, read on
// the server (src/lib/portal/load.ts); signed out, or with ?real=0, the stand-ins the design was
// made on. The switches in the URL are listed in Shell.tsx. Production builds return 404.
import { notFound } from "next/navigation";
import { safeAuth } from "@/lib/auth/dev-auth";
import { loadPortalData } from "@/lib/portal/load";
import { loadStudentContext } from "@/lib/student/context";
import Portal from "@/app/dashboard/student/_portal/Shell";

export const dynamic = "force-dynamic";

export default async function ShellDevPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const standIns = (await searchParams).real === "0";
  const { userId } = await safeAuth();
  const data = userId && !standIns ? await loadPortalData(await loadStudentContext()) : null;
  return <Portal data={data} />;
}
