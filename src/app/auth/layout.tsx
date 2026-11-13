// The sign-in and Get started pages wear the home page's look, so they load the site's styles and their own.
import "@/app/(site)/site-styles";
import "./auth.css";
// TEMPORARY: the layouts on offer; delete once the founder picks.
import "./auth-options.css";
import "./cabin.css";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
