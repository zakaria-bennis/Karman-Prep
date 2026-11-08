// Every address the marketing pages link to. Sitemap, middleware and the floating theme toggle
// read the public list below, so a new page is added in one place.

export const ROUTES = {
  home: "/",
  program: "/program",
  private: "/private-tutoring",
  schools: "/schools",
  tutors: "/for-tutors",
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
  signUp: "/auth/sign-up",
  billing: "/billing",
  /** A plan button: sign-up if needed, then straight to Stripe Checkout. */
  checkout: "/checkout/start",
  calculator: "/calculator",
} as const;

/** Pages drawn with the marketing shell (its own header, theme switch and footer). */
export const SITE_PAGES = [
  ROUTES.home,
  ROUTES.program,
  ROUTES.private,
  ROUTES.schools,
  ROUTES.tutors,
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
