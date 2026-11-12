// The numbers the Private tutoring page's sections share, worked out once from offer.ts.
import {
  formatPrice,
  GUARANTEE as G,
  MARCH_PROGRAM as MP,
  PRIVATE_PACKAGES,
} from "@/lib/marketing/offer";

const [P10, P20] = PRIVATE_PACKAGES;
const money = (n: number) =>
  Number.isInteger(n)
    ? formatPrice(n)
    : `$${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

export const PRIVATE_FACTS = {
  small: {
    name: P10.name,
    sessions: P10.hours,
    price: formatPrice(P10.price),
    each: money(P10.price / P10.hours),
    gain: G.bands[0].cohort,
    free: G.private.packages["private-10"].freeSessions,
  },
  large: {
    name: P20.name,
    sessions: P20.hours,
    price: formatPrice(P20.price),
    each: money(P20.price / P20.hours),
    gain: G.bands[0].private,
    free: G.private.packages["private-20"].freeSessions,
  },
  cohort: { price: formatPrice(MP.price), gain: G.bands[0].cohort },
  extra: money(G.private.extraSessionPrice),
  /** Twenty sessions bought one at a time, and what Private 20 saves against that. */
  single: money(P20.hours * G.private.extraSessionPrice),
  saved: money(P20.hours * G.private.extraSessionPrice - P20.price),
} as const;
