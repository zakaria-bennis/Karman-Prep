"use client";

import { usePathname } from "next/navigation";
import { ThemeSelector } from "@/components/shared/ThemeSelector";

export default function ParentLayoutThemeSelector() {
  const pathname = usePathname();
  if (pathname === "/dashboard/parent") return null;
  return (
    <div className="flex justify-end border-b border-bronze bg-surface px-4 py-1">
      <ThemeSelector />
    </div>
  );
}
