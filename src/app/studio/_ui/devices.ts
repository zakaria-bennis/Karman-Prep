// Screen sizes the studio can show a page at, in CSS pixels.
import type { Viewport } from "@/lib/page-studio/schemas";

export const DEVICES: Record<Viewport, { label: string; width: number; height: number }> = {
  desktop: { label: "Desktop", width: 1440, height: 900 },
  laptop: { label: "Laptop", width: 1280, height: 800 },
  tablet: { label: "Tablet", width: 820, height: 1180 },
  phone: { label: "Phone", width: 390, height: 844 },
};

export type Mode = "browse" | "comment" | "edit";

export const MODES: { id: Mode; label: string; hint: string; key: string }[] = [
  { id: "browse", label: "Use", hint: "Click, type and watch the page work", key: "b" },
  { id: "comment", label: "Comment", hint: "Click anything to leave a note on it", key: "c" },
  { id: "edit", label: "Edit words", hint: "Click any words and retype them", key: "e" },
];

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}
