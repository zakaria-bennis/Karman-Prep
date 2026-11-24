// Sign in, at the snowy cabin (CabinStage.tsx). Clerk still does the signing in.
import CabinStage from "@/components/auth/CabinStage";
import { cabinFont } from "@/components/auth/cabin-font";
import { greetingsFor } from "@/components/auth/greetings";
import SitePage from "@/components/site/SitePage";
import { devBypassClerkId, safeAuth } from "@/lib/auth/dev-auth";
import { safeNext } from "@/lib/auth/portal-home";
import { redirect } from "next/navigation";
import { litFonts } from "@/components/site/home/fonts";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string }>;
}) {
  const { redirect_url } = await searchParams;
  // On the local test copy, signing in is a one-click pick of a test account (/dev/sign-in).
  if (devBypassClerkId()) redirect("/dev/sign-in");
  // Someone already signed in has no business here: on to where they were going, or their portal.
  // (Not on the dev server's stand-in account, which is always "signed in".)
  if (!devBypassClerkId() && (await safeAuth()).userId) redirect(safeNext(redirect_url));
  return (
    <SitePage kind="lit" flight={false} className={`${litFonts} ${cabinFont.variable} cb-page`}>
      <CabinStage
        mode="sign-in"
        greetings={greetingsFor("sign-in", redirect_url)}
        next={redirect_url}
      />
    </SitePage>
  );
}
