// Every address that matches no other page lands here and is answered with the marketing site's 404 page
// ((site)/not-found.tsx) and a 404 status. Without this catch-all, Next.js would draw the root
// not-found.tsx, and anything that file imports is loaded by every route in the app.
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: { absolute: "Page not found | Karman Prep" },
  robots: { index: false, follow: true },
};

export default function Missing() {
  notFound();
}
