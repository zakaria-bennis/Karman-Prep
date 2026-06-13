// ============================================================
// Clerk theme — Karman brand skin.
// Applied globally via <ClerkProvider appearance={karmanClerkAppearance} />
// so every Clerk surface (sign-in, sign-up, UserProfile, UserButton
// dropdown, invitations) inherits the same dark brand look.
//
// We layer the official `dark` baseTheme from @clerk/themes
// underneath our token + element overrides — that gives us
// readable contrast on every Clerk-rendered modal we don't
// explicitly style (UserProfile sub-pages, MFA flows, etc.)
// without having to enumerate each element class by hand.
//
// Observatory system (docs/brand.md): warm night surfaces, ivory
// text, bronze borders, antique-gold primary actions.
// ============================================================

import { dark } from "@clerk/themes";

// The `Appearance` type from @clerk/types isn't exposed as a separate package
// dependency, so we let TypeScript infer the shape via the `as const` satisfies
// pattern. ClerkProvider will validate when this is applied.
export const karmanClerkAppearance = {
  // Sets every default colour/border/etc. to dark-mode-safe values.
  // Our `variables` and `elements` below override on top.
  baseTheme: dark,
  // Color tokens Clerk uses internally — the observatory palette so the
  // auth flow feels continuous with the landing.
  variables: {
    colorPrimary: "#C8AB6A", // antique gold — matches btn-primary
    colorDanger: "#D84F73", // R&W rose doubles as the error tone
    colorSuccess: "#C8AB6A",
    colorWarning: "#E4C86A",
    colorBackground: "#0D0A08", // deep espresso
    colorInputBackground: "#171611", // surface
    colorInputText: "#F3ECDD",
    colorText: "#F3ECDD",
    colorTextSecondary: "#B8B0A1",
    colorTextOnPrimaryBackground: "#070605", // night text on gold
    colorNeutral: "#B8B0A1",
    borderRadius: "1rem", // rounded-2xl — matches landing cards
    fontFamily: "var(--font-plex-sans), Inter, system-ui, sans-serif",
    fontFamilyButtons: "var(--font-plex-sans), Inter, system-ui, sans-serif",
    fontSize: "0.95rem",
    fontWeight: {
      normal: "400",
      medium: "500",
      semibold: "600",
      bold: "600", // brand caps weights at 600
    },
  },

  // Per-element Tailwind / arbitrary class overrides
  elements: {
    rootBox: "w-full flex items-center justify-center",

    // The main auth card — flat warm surface with a bronze hairline
    card: "bg-surface border border-bronze shadow-2xl",

    // Header — inside the card
    headerTitle: "text-ivory font-plex-serif font-medium tracking-tight",
    headerSubtitle: "text-taupe",

    // Primary submit button — antique gold, night text
    formButtonPrimary:
      "bg-gold text-night font-semibold normal-case " +
      "hover:bg-gold-bright transition-colors shadow-none",

    // Secondary / outline buttons (e.g. "Continue with Apple/Google")
    socialButtonsBlockButton:
      "bg-charcoal border border-bronze text-ivory hover:bg-surface-raised hover:border-taupe/50 transition-colors",
    socialButtonsBlockButtonText: "text-ivory font-semibold",
    socialButtonsProviderIcon: "brightness-150",

    // Form fields
    formFieldInput:
      "bg-charcoal border border-bronze text-ivory " +
      "placeholder:text-taupe/70 focus:border-gold/70 focus:ring-1 focus:ring-gold/30",
    formFieldLabel: "text-taupe font-semibold text-xs uppercase tracking-wider",
    formFieldInputShowPasswordButton: "text-taupe hover:text-ivory",
    formFieldAction: "text-gold-bright hover:text-gold",

    // Footer (e.g. "Don't have an account? Sign up")
    footer: "bg-transparent",
    footerAction: "text-taupe",
    footerActionLink: "text-gold-bright hover:text-gold font-semibold",
    footerActionText: "text-taupe",

    // Divider "or"
    dividerLine: "bg-bronze",
    dividerText: "text-taupe",

    // Identity preview chip (during multi-step flows)
    identityPreview: "bg-charcoal border border-bronze",
    identityPreviewText: "text-ivory",
    identityPreviewEditButton: "text-gold-bright hover:text-gold",

    // OTP/verification boxes
    otpCodeFieldInput:
      "bg-charcoal border border-bronze text-ivory " +
      "focus:border-gold/70 focus:ring-1 focus:ring-gold/30",

    // Alerts inside the card
    alert: "bg-rw/10 border border-rw/30 text-ivory",
    alertText: "text-ivory",

    // Avatar (UserButton trigger)
    avatarBox: "w-7 h-7",

    // UserButton popover menu
    userButtonPopoverCard: "bg-surface border border-bronze backdrop-blur-md",
    userButtonPopoverActionButton: "text-ivory hover:bg-surface-raised",
    userButtonPopoverActionButtonText: "text-ivory",
    userButtonPopoverFooter: "bg-transparent border-bronze",

    // UserProfile surface (Settings page inside Clerk).
    modalContent: "bg-espresso",
    modalCloseButton: "text-taupe hover:text-ivory",
    pageScrollBox: "bg-espresso",
    page: "bg-espresso",
    scrollBox: "bg-espresso",
    cardBox: "bg-espresso border border-bronze",

    // Sidebar nav.
    navbar: "bg-charcoal border-r border-bronze",
    navbarButton: "text-taupe hover:text-ivory hover:bg-surface rounded-lg",
    navbarButtonText: "text-ivory font-semibold",
    navbarButton__active: "bg-gold/10 text-ivory border border-gold/30",
    navbarMobileMenuRow: "border-bronze",
    navbarMobileMenuButton: "text-taupe hover:text-ivory",

    // Section heading + each row's label / value.
    profileSectionTitle: "text-ivory font-semibold",
    profileSectionTitleText: "text-ivory",
    profileSectionContent: "text-ivory/90",
    profileSectionPrimaryButton: "text-gold-bright hover:text-gold font-semibold",
    profileSection__connectedAccounts: "text-ivory/90",
    profilePage: "text-ivory",

    // Form rows inside the section accordions.
    formFieldLabelRow: "text-taupe",
    accordionTriggerButton: "text-ivory hover:bg-surface-raised",
    accordionContent: "text-ivory/90",

    // Per-row kebab + dropdown menu.
    menuButton: "text-taupe hover:text-ivory",
    menuList: "bg-surface border border-bronze shadow-2xl",
    menuItem: "text-ivory hover:bg-surface-raised",

    // "Primary" / status badges next to email & phone.
    badge: "bg-gold/10 text-gold-bright border border-gold/30",
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
