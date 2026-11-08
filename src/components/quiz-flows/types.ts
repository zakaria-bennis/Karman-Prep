import type { PortalNavItem } from "@/components/portal";

/** The painted shell's student details: first name, email, the portal's streak and tabs. */
export type ShellUser = {
  name: string | null;
  email: string | null;
  streak: number;
  nav: PortalNavItem[];
};
