// The guided intake lives in the home page's world (the live landscape, the site's type and buttons), so it
// loads the marketing site's styles, as the sign-in pages do, and then its own.
import "@/app/(site)/site-styles";
import "./intake.css";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
