// TEMPORARY mockups for the in-app "page isn't here" screen. Deleted once the founder picks one.
import { portalFontVars } from "@/components/portal/fonts";
import LostOptions from "./LostOptions";

export default async function Page({ searchParams }: { searchParams: Promise<{ o?: string }> }) {
  const { o } = await searchParams;
  return (
    <div className={portalFontVars}>
      <LostOptions option={o ?? "a"} />
    </div>
  );
}
