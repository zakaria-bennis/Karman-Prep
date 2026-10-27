import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppFrame } from "@/components/student/AppFrame";
import { previewAllowed } from "@/lib/student/preview-bank";

export const metadata: Metadata = {
  title: "Student preview",
  robots: { index: false, follow: false },
};

/** Founder preview of the student app. A release build returns 404 here. */
export default function StudentPreviewLayout({ children }: { children: React.ReactNode }) {
  if (!previewAllowed()) notFound();
  return <AppFrame base="/student-preview">{children}</AppFrame>;
}
