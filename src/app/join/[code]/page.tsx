// /join/[code]: a tutor's shared link. The student lands in Settings (Parent, tutor and class) with
// the code filled in and one Join; signed out, they sign up first and come back to the same link.
import { toSettings } from "@/lib/portal/settings-redirects";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const clean = decodeURIComponent(code).slice(0, 20);
  return toSettings("people", { code: clean }, "/join/" + encodeURIComponent(clean));
}
