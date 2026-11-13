// Sign in, in the home page's world (AuthStage.tsx). Clerk still does the signing in.
// TEMPORARY: ?o= picks one of the layouts on offer (auth-options.ts); delete once the founder picks.
import AuthStage, { OptionPicker } from "@/components/auth/AuthStage";
import CabinStage from "@/components/auth/CabinStage";
import { cabinFont } from "@/components/auth/cabin-font";
import { authCopy, CABIN, readOption } from "@/components/auth/auth-options";
import SitePage from "@/components/site/SitePage";
import { litFonts } from "@/components/site/home/fonts";

export default async function SignInPage({
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
        <OptionPicker mode="sign-in" option={option} />
        <CabinStage mode="sign-in" {...CABIN["sign-in"]} />
      </SitePage>
    );
  }
  return (
    <SitePage kind="lit" route={[0.42, 0.42]} className={`${litFonts} sn-page sn-page-${option}`}>
      <AuthStage mode="sign-in" option={option} {...authCopy("sign-in", option)} />
    </SitePage>
  );
}
