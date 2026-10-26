// Every address the marketing pages link to. Sitemap, middleware and the floating theme toggle
// read the public list below, so a new page is added in one place.

export const ROUTES = {
  home: "/",
  program: "/program",
  private: "/private-tutoring",
  test: "/free-practice-test",
  pricing: "/pricing",
  guarantee: "/guarantee",
  faq: "/faq",
  about: "/about",
  research: "/research",
  terms: "/terms",
  privacy: "/privacy",
  refunds: "/refunds",
  signIn: "/auth/sign-in",
  calculator: "/calculator",
} as const;

/** Pages drawn with the marketing shell (its own header, theme switch and footer). */
export const SITE_PAGES = [
  ROUTES.home,
  ROUTES.program,
  ROUTES.private,
  ROUTES.test,
  ROUTES.pricing,
  ROUTES.guarantee,
  ROUTES.faq,
  ROUTES.about,
  ROUTES.research,
  ROUTES.terms,
  ROUTES.privacy,
  ROUTES.refunds,
] as const;
