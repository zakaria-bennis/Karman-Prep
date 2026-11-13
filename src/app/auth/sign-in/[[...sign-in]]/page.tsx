// Sign in, in the home page's world (AuthStage.tsx). Clerk still does the signing in.
import AuthStage from "@/components/auth/AuthStage";
import SitePage from "@/components/site/SitePage";
import { litFonts } from "@/components/site/home/fonts";

export default function SignInPage() {
  return (
    <SitePage kind="lit" route={[0.42, 0.42]} className={`${litFonts} sn-page`}>
      <AuthStage mode="sign-in" headline="Welcome back." line="Pick up where you left off." />
    </SitePage>
  );
}
