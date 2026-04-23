// ============================================================
// Shared utility functions
// ============================================================

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merges Tailwind class names safely, resolving conflicts. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formats a number as a US dollar string, e.g. 40 → "$40" */
export function formatPrice(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(cents / 100);
}

/** Returns a 0–100 percentage given a numerator and denominator */
export function pct(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

/** Capitalizes the first letter of a string */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/** Returns the predicted SAT score range from a 0–100 domain average */
export function predictScoreRange(domainAvg: number): { low: number; high: number } {
  // SAT Math section: 200–800. Map domain avg (0–100) linearly.
  const base = Math.round(200 + (domainAvg / 100) * 600);
  return { low: Math.max(200, base - 30), high: Math.min(800, base + 30) };
}
