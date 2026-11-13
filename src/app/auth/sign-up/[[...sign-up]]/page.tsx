// Get started, in the home page's world (AuthStage.tsx). Clerk still makes the account.
// Every new account starts on the Free plan; paid plans are picked later in Billing.
// TEMPORARY: ?o= picks one of the layouts on offer (auth-options.ts); delete once the founder picks.
import AuthStage, { OptionPicker } from "@/components/auth/AuthStage";
import CabinStage from "@/components/auth/CabinStage";
import { cabinFont } from "@/components/auth/cabin-font";
import { authCopy, CABIN, readOption } from "@/components/auth/auth-options";
import SitePage from "@/components/site/SitePage";
import { litFonts } from "@/components/site/home/fonts";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ o?: string }>;
}) {
  const option = readOption((await searchParams).o);
  if (option === "cabin") {
    return (
      <SitePage
        kind="lit"
        flight={false}
        className={`${litFonts} ${cabinFont.variable} sn-page cb-page`}
      >
        <OptionPicker mode="sign-up" option={option} />
        <CabinStage mode="sign-up" {...CABIN["sign-up"]} />
      </SitePage>
    );
  }
  return (
    <SitePage kind="lit" route={[0.3, 0.3]} className={`${litFonts} sn-page sn-page-${option}`}>
      <AuthStage mode="sign-up" option={option} {...authCopy("sign-up", option)} />
    </SitePage>
  );
}
