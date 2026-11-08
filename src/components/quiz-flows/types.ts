import type { AccountMenuItem, PortalNavItem } from "@/components/portal";

/** The painted shell's student details: first name, email, the portal's streak, tabs and menu. */
export type ShellUser = {
  name: string | null;
  email: string | null;
  streak: number;
  nav: PortalNavItem[];
  menu: AccountMenuItem[];
};
