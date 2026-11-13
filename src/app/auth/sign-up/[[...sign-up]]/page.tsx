// Get started, in the home page's world (AuthStage.tsx). Clerk still makes the account.
// Every new account starts on the Free plan; paid plans are picked later in Billing.
// TEMPORARY: ?o= picks one of the layouts on offer (auth-options.ts); delete once the founder picks.
import AuthStage from "@/components/auth/AuthStage";
import { authCopy, readOption } from "@/components/auth/auth-options";
import SitePage from "@/components/site/SitePage";
import { litFonts } from "@/components/site/home/fonts";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ o?: string }>;
}) {
  const option = readOption((await searchParams).o);
  return (
    <SitePage kind="lit" route={[0.3, 0.3]} className={`${litFonts} sn-page sn-page-${option}`}>
      <AuthStage mode="sign-up" option={option} {...authCopy("sign-up", option)} />
    </SitePage>
  );
}
