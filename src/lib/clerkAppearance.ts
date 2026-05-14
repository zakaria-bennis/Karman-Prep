// ============================================================
// Clerk theme — Karman brand skin.
// Applied globally via <ClerkProvider appearance={strataClerkAppearance} />
// so every Clerk surface (sign-in, sign-up, UserProfile, UserButton
// dropdown, invitations) inherits the same dark brand look.
//
// We layer the official `dark` baseTheme from @clerk/themes
// underneath our token + element overrides — that gives us
// readable contrast on every Clerk-rendered modal we don't
// explicitly style (UserProfile sub-pages, MFA flows, etc.)
// without having to enumerate each element class by hand.
//
// To tweak: edit values here. No other changes required.
// ============================================================

import { dark } from "@clerk/themes";

// The `Appearance` type from @clerk/types isn't exposed as a separate package
// dependency, so we let TypeScript infer the shape via the `as const` satisfies
// pattern. ClerkProvider will validate when this is applied.
export const strataClerkAppearance = {
  // Sets every default colour/border/etc. to dark-mode-safe values.
  // Our `variables` and `elements` below override on top.
  baseTheme: dark,
  // Color tokens Clerk uses internally — aligned with the landing's
  // cloud palette (blue + violet) so the auth flow feels continuous.
  variables: {
    colorPrimary: "#3B82F6", // blue-500 — matches btn-primary
    colorDanger: "#ef4444",
    colorSuccess: "#10b981",
    colorWarning: "#f59e0b",
    colorBackground: "#0B1026", // cloud-bg-soft (matches --cloud-bg-soft)
    colorInputBackground: "#0a0f22",
    colorInputText: "#f8fafc",
    colorText: "#f8fafc",
    colorTextSecondary: "#94a3b8",
    colorTextOnPrimaryBackground: "#ffffff",
    colorNeutral: "#cbd5e1",
    borderRadius: "1rem", // rounded-2xl — matches landing cards
    fontFamily: "var(--font-geist-sans), Inter, system-ui, sans-serif",
    fontFamilyButtons: "var(--font-geist-sans), Inter, system-ui, sans-serif",
    fontSize: "0.95rem",
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

    // UserProfile surface (Settings page inside Clerk).
    // The dark baseTheme handles background; we tighten the text
    // contrast here for the parts the screenshot showed as washed
    // out (sidebar nav, section row labels/values, kebab menus).
    modalContent: "bg-[#0B1026]",
    modalCloseButton: "text-slate-400 hover:text-white",
    pageScrollBox: "bg-[#0B1026]",
    page: "bg-[#0B1026]",
    scrollBox: "bg-[#0B1026]",
    cardBox: "bg-[#0B1026] border border-white/10",

    // Sidebar nav — was very dim against the navy.
    navbar: "bg-white/[0.02] border-r border-white/10",
    navbarButton: "text-slate-300 hover:text-white hover:bg-white/[0.06] rounded-lg",
    navbarButtonText: "text-slate-200 font-semibold",
    navbarButton__active: "bg-blue-500/15 text-white border border-blue-400/30",
    navbarMobileMenuRow: "border-white/10",
    navbarMobileMenuButton: "text-slate-300 hover:text-white",

    // Section heading + each row's label / value (the things that
    // looked dark-on-dark in the screenshot).
    profileSectionTitle: "text-white font-bold",
    profileSectionTitleText: "text-white",
    profileSectionContent: "text-slate-200",
    profileSectionPrimaryButton: "text-blue-300 hover:text-blue-200 font-semibold",
    profileSection__connectedAccounts: "text-slate-200",
    profilePage: "text-slate-100",

    // Form rows inside the section accordions.
    formFieldLabelRow: "text-slate-300",
    accordionTriggerButton: "text-slate-200 hover:bg-white/[0.04]",
    accordionContent: "text-slate-200",

    // Per-row kebab + dropdown menu.
    menuButton: "text-slate-400 hover:text-white",
    menuList: "bg-[#0B1026] border border-white/10 shadow-2xl",
    menuItem: "text-slate-200 hover:bg-white/[0.06]",

    // "Primary" / status badges next to email & phone.
    badge: "bg-blue-500/15 text-blue-200 border border-blue-400/30",
  },

  // Layout tweaks — logo image shown at top of the Clerk card
  layout: {
    logoPlacement: "none", // we'll render our own logo outside the card
    showOptionalFields: true,
    socialButtonsVariant: "blockButton",
    helpPageUrl: "/faq",
    privacyPageUrl: "/privacy",
    termsPageUrl: "/terms",
  },
};
