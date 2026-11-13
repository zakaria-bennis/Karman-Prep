// Sign in, at the snowy cabin (CabinStage.tsx). Clerk still does the signing in.
import CabinStage from "@/components/auth/CabinStage";
import { cabinFont } from "@/components/auth/cabin-font";
import { GREETINGS } from "@/components/auth/greetings";
import SitePage from "@/components/site/SitePage";
import { litFonts } from "@/components/site/home/fonts";

export default function Page() {
  return (
    <SitePage kind="lit" flight={false} className={`${litFonts} ${cabinFont.variable} cb-page`}>
      <CabinStage mode="sign-in" greetings={GREETINGS["sign-in"]} />
    </SitePage>
  );
}
