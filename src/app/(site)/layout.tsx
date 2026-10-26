// The marketing pages (home, the SAT Program, private tutoring, the free practice test, pricing, the
// guarantee, About, FAQ and the legal pages). Each page draws its own frame with SitePage; this layout only
// loads the site's styles, all scoped under .ks so none of them reach the student app.
import "./styles/film.css";
import "./styles/phone.css";
import "./styles/kit.css";
import "./styles/screens.css";
import "./styles/inner.css";
import "./styles/pricing.css";
import "./styles/photos.css";
import "./styles/alive.css";
import "./styles/site.css";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return children;
}
