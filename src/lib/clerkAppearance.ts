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
  // Color tokens Clerk uses internally
  variables: {
    colorPrimary:           "#EC4899",           // pink — matches logo gradient start
    colorDanger:            "#ef4444",
    colorSuccess:           "#10b981",
    colorWarning:           "#f59e0b",
    colorBackground:        "#0b1220",           // deep navy, same family as constellation bg
    colorInputBackground:   "#0f172a",
    colorInputText:         "#f8fafc",
    colorText:              "#f8fafc",
    colorTextSecondary:     "#94a3b8",
    colorTextOnPrimaryBackground: "#ffffff",
    colorNeutral:           "#cbd5e1",
    borderRadius:           "0.75rem",
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

    // The main signed-in/out card
    card: "bg-slate-900/70 border border-slate-800 shadow-2xl backdrop-blur-sm",

    // Header — inside the card
    headerTitle: "text-white font-extrabold tracking-tight",
    headerSubtitle: "text-slate-400",

    // Primary submit button — gradient matching the logo
    formButtonPrimary:
      "bg-gradient-to-r from-pink-500 via-fuchsia-500 to-sky-400 " +
      "text-white font-bold normal-case shadow-md shadow-pink-500/20 " +
      "hover:from-pink-400 hover:via-fuchsia-400 hover:to-sky-300 transition-all",

    // Secondary / outline buttons (e.g. "Continue with…", "Use another method")
    socialButtonsBlockButton:
      "bg-slate-800/60 border border-slate-700 text-slate-100 hover:bg-slate-700 transition-colors",
    socialButtonsBlockButtonText: "text-slate-100 font-semibold",
    socialButtonsProviderIcon: "brightness-150",

    // Form fields
    formFieldInput:
      "bg-slate-950/60 border border-slate-700 text-slate-100 " +
      "placeholder:text-slate-600 focus:border-pink-400/60 focus:ring-1 focus:ring-pink-400/30",
    formFieldLabel: "text-slate-300 font-semibold text-xs uppercase tracking-wider",
    formFieldInputShowPasswordButton: "text-slate-500 hover:text-slate-300",
    formFieldAction: "text-pink-400 hover:text-pink-300",

    // Footer (e.g. "Don't have an account? Sign up")
    footer: "bg-transparent",
    footerAction: "text-slate-400",
    footerActionLink: "text-pink-400 hover:text-pink-300 font-semibold",
    footerActionText: "text-slate-400",

    // Divider "or"
    dividerLine: "bg-slate-700",
    dividerText: "text-slate-500",

    // Identity preview chip (during multi-step flows)
    identityPreview: "bg-slate-800/60 border border-slate-700",
    identityPreviewText: "text-slate-200",
    identityPreviewEditButton: "text-pink-400 hover:text-pink-300",

    // OTP/verification boxes
    otpCodeFieldInput:
      "bg-slate-950/60 border border-slate-700 text-slate-100 " +
      "focus:border-pink-400/60 focus:ring-1 focus:ring-pink-400/30",

    // Alerts inside the card
    alert: "bg-rose-500/10 border border-rose-500/30 text-rose-200",
    alertText: "text-rose-200",

    // Avatar (UserButton trigger)
    avatarBox: "w-7 h-7",

    // UserButton popover menu
    userButtonPopoverCard: "bg-slate-900/95 border border-slate-800 backdrop-blur-md",
    userButtonPopoverActionButton: "text-slate-200 hover:bg-white/5",
    userButtonPopoverActionButtonText: "text-slate-200",
    userButtonPopoverFooter: "bg-transparent border-slate-800",

    // UserProfile surface (Settings page inside Clerk)
    pageScrollBox: "bg-slate-950",
    profileSectionPrimaryButton: "text-pink-400 hover:text-pink-300",
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
