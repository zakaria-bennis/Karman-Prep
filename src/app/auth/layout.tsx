// The sign-in and Start free pages wear the home page's look, so they load the site's styles and their own.
import "@/app/(site)/site-styles";
import "./auth.css";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
