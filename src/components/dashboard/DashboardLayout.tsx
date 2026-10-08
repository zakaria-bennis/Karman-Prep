"use client";

import { usePathname } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { useTheme } from "@/components/shared/ThemeProvider";
import { clerkAppearanceForTheme } from "@/lib/clerkAppearance";
import { useUnreadChat } from "@/lib/hooks/useUnreadChat";
import PortalShell from "@/components/shared/PortalShell";

/** Shared student/educator workspace; authorization stays in route layouts. */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const clerk = useClerk();
  const { palette } = useTheme();
  const unread = useUnreadChat();
  return (
    <PortalShell
      area={pathname.startsWith("/tutor") ? "tutor" : "student"}
      unread={unread}
      onProfile={() => clerk.openUserProfile({ appearance: clerkAppearanceForTheme(palette) })}
    >
      {children}
    </PortalShell>
  );
}
