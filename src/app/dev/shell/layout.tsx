import type { Viewport } from "next";
import type { ReactNode } from "react";

// The portal fills the whole screen of a phone, under the status bar and round the home line, so
// that its bottom bar can keep clear of them itself (env(safe-area-inset-bottom) in
// shell.module.css). Without this the browser reports no safe area at all.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function ShellLayout({ children }: { children: ReactNode }) {
  return children;
}
