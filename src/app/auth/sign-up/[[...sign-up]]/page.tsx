// Get started, at the snowy cabin (CabinStage.tsx). Clerk still makes the account.
// Every new account starts on the Free plan; paid plans are picked later in Billing.
import CabinStage from "@/components/auth/CabinStage";
import { cabinFont } from "@/components/auth/cabin-font";
import { greetingsFor } from "@/components/auth/greetings";
import SitePage from "@/components/site/SitePage";
import { litFonts } from "@/components/site/home/fonts";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string }>;
}) {
  const { redirect_url } = await searchParams;
  return (
    <SitePage kind="lit" flight={false} className={`${litFonts} ${cabinFont.variable} cb-page`}>
      <CabinStage mode="sign-up" greetings={greetingsFor("sign-up", redirect_url)} />
    </SitePage>
  );
}
