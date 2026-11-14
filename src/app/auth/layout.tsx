// The sign-in and Get started pages share the marketing frame (SitePage), so they load the site's styles,
// and then their own: the snowy cabin and the warm form (cabin.css).
import "@/app/(site)/site-styles";
import "./cabin.css";
import "./cabin-fields.css";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
