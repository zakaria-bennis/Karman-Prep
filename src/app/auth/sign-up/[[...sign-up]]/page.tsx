// Get started, in the home page's world (AuthStage.tsx). Clerk still makes the account.
// Every new account starts on the Free plan; paid plans are picked later in Billing.
import AuthStage from "@/components/auth/AuthStage";
import SitePage from "@/components/site/SitePage";
import { litFonts } from "@/components/site/home/fonts";

export default function SignUpPage() {
  return (
    <SitePage kind="lit" route={[0.3, 0.3]} className={`${litFonts} sn-page`}>
      <AuthStage
        mode="sign-up"
        headline="Get started."
        line="Make your account in under a minute."
      />
    </SitePage>
  );
}
