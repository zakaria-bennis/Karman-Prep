// ============================================================
// Clerk theme — Strata brand skin.
// Applied globally via <ClerkProvider appearance={strataClerkAppearance} />
// so every Clerk surface (sign-in, sign-up, UserProfile, UserButton
// dropdown, invitations) inherits the same dark brand look.
//
// To tweak: edit values here. No other changes required.
// ============================================================

// The `Appearance` type from @clerk/types isn't exposed as a separate package
// dependency, so we let TypeScript infer the shape via the `as const` satisfies
// pattern. ClerkProvider will validate when this is applied.
export const strataClerkAppearance = {
  // Color tokens Clerk uses internally — aligned with the landing's
  // cloud palette (blue + violet) so the auth flow feels continuous.
  variables: {
    colorPrimary:           "#3B82F6",           // blue-500 — matches btn-primary
    colorDanger:            "#ef4444",
    colorSuccess:           "#10b981",
    colorWarning:           "#f59e0b",
    colorBackground:        "#0B1026",           // cloud-bg-soft (matches --cloud-bg-soft)
    colorInputBackground:   "#0a0f22",
    colorInputText:         "#f8fafc",
    colorText:              "#f8fafc",
    colorTextSecondary:     "#94a3b8",
    colorTextOnPrimaryBackground: "#ffffff",
    colorNeutral:           "#cbd5e1",
    borderRadius:           "1rem",              // rounded-2xl — matches landing cards
    fontFamily:             "var(--font-geist-sans), Inter, system-ui, sans-serif",
    fontFamilyButtons:      "var(--font-geist-sans), Inter, system-ui, sans-serif",
    fontSize:               "0.95rem",
    fontWeight: {
      normal: "400",
      medium: "500",
      semibold: "600",
      bold: "700",
    },
  },

  // Per-element Tailwind / arbitrary class overrides
  elements: {
    rootBox: "w-full flex items-center justify-center",

    // The main auth card — glass-cloud aesthetic (white/4 on backdrop)
    card: "bg-white/[0.04] border border-white/10 shadow-2xl backdrop-blur-md",

    // Header — inside the card
    headerTitle: "text-white font-extrabold tracking-tight",
    headerSubtitle: "text-slate-400",

    // Primary submit button — blue→violet gradient, echoes the rotating word
    formButtonPrimary:
      "bg-gradient-to-r from-blue-600 via-indigo-500 to-violet-500 " +
      "text-white font-bold normal-case shadow-md shadow-blue-500/25 " +
      "hover:from-blue-500 hover:via-indigo-400 hover:to-violet-400 transition-all",

    // Secondary / outline buttons (e.g. "Continue with Apple/Google")
    socialButtonsBlockButton:
      "bg-white/[0.04] border border-white/15 text-slate-100 hover:bg-white/[0.08] hover:border-white/25 transition-colors",
    socialButtonsBlockButtonText: "text-slate-100 font-semibold",
    socialButtonsProviderIcon: "brightness-150",

    // Form fields
    formFieldInput:
      "bg-white/[0.03] border border-white/10 text-slate-100 " +
      "placeholder:text-slate-500 focus:border-blue-400/60 focus:ring-1 focus:ring-blue-400/30",
    formFieldLabel: "text-slate-300 font-semibold text-xs uppercase tracking-wider",
    formFieldInputShowPasswordButton: "text-slate-500 hover:text-slate-300",
    formFieldAction: "text-blue-300 hover:text-blue-200",

    // Footer (e.g. "Don't have an account? Sign up")
    footer: "bg-transparent",
    footerAction: "text-slate-400",
    footerActionLink: "text-blue-300 hover:text-blue-200 font-semibold",
    footerActionText: "text-slate-400",

    // Divider "or"
    dividerLine: "bg-white/10",
    dividerText: "text-slate-500",

    // Identity preview chip (during multi-step flows)
    identityPreview: "bg-white/[0.04] border border-white/10",
    identityPreviewText: "text-slate-200",
    identityPreviewEditButton: "text-blue-300 hover:text-blue-200",

    // OTP/verification boxes
    otpCodeFieldInput:
      "bg-white/[0.03] border border-white/10 text-slate-100 " +
      "focus:border-blue-400/60 focus:ring-1 focus:ring-blue-400/30",

    // Alerts inside the card
    alert: "bg-rose-500/10 border border-rose-400/30 text-rose-200",
    alertText: "text-rose-200",

    // Avatar (UserButton trigger)
    avatarBox: "w-7 h-7",

    // UserButton popover menu
    userButtonPopoverCard: "bg-slate-900/95 border border-white/10 backdrop-blur-md",
    userButtonPopoverActionButton: "text-slate-200 hover:bg-white/5",
    userButtonPopoverActionButtonText: "text-slate-200",
    userButtonPopoverFooter: "bg-transparent border-white/10",

    // UserProfile surface (Settings page inside Clerk)
    pageScrollBox: "bg-slate-950",
    profileSectionPrimaryButton: "text-blue-300 hover:text-blue-200",
  },

  // Layout tweaks — logo image shown at top of the Clerk card
  layout: {
    logoPlacement: "none",    // we'll render our own logo outside the card
    showOptionalFields: true,
    socialButtonsVariant: "blockButton",
    helpPageUrl: "/faq",
    privacyPageUrl: "/privacy",
    termsPageUrl: "/terms",
  },
};
