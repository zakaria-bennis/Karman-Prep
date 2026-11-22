// /join/class: a student joins their school class with its code in Settings (Parent, tutor and
// class), with the code filled in from ?code=. Signed out, they sign in first and come back here.
import { toSettings } from "@/lib/portal/settings-redirects";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;
  const clean = (code ?? "").toUpperCase().slice(0, 12);
  const back = clean ? `/join/class?code=${encodeURIComponent(clean)}` : "/join/class";
  return toSettings("people", { class: clean }, back, true);
}
