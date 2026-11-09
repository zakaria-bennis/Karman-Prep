// The marketing pages (home, the SAT Program, private tutoring, the free practice test, pricing, the
// guarantee, About, FAQ and the legal pages). Each page draws its own frame with SitePage; this layout only
// loads the site's styles (site-styles.ts).
import "./site-styles";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return children;
}
