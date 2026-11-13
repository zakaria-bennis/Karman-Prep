// Sign in, in the home page's world (AuthStage.tsx). Clerk still does the signing in.
// TEMPORARY: ?o= picks one of the layouts on offer (auth-options.ts); delete once the founder picks.
import AuthStage from "@/components/auth/AuthStage";
import { authCopy, readOption } from "@/components/auth/auth-options";
import SitePage from "@/components/site/SitePage";
import { litFonts } from "@/components/site/home/fonts";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ o?: string }>;
}) {
  const option = readOption((await searchParams).o);
  return (
    <SitePage kind="lit" route={[0.42, 0.42]} className={`${litFonts} sn-page sn-page-${option}`}>
      <AuthStage mode="sign-in" option={option} {...authCopy("sign-in", option)} />
    </SitePage>
  );
}
