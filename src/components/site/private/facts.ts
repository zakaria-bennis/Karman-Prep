// The numbers the Private tutoring page's plans show, worked out once from offer.ts.
import { formatPrice, PRIVATE_PACKAGES } from "@/lib/marketing/offer";

const [P10, P20] = PRIVATE_PACKAGES;
const money = (n: number) =>
  Number.isInteger(n)
    ? formatPrice(n)
    : `$${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
const each10 = P10.price / P10.hours;
const each20 = P20.price / P20.hours;

export const PRIVATE_FACTS = {
  small: { name: P10.name, price: formatPrice(P10.price), each: money(each10) },
  large: { name: P20.name, price: formatPrice(P20.price), each: money(each20) },
  /** What a Private 20 session saves against a Private 10 session, rounded down: "16%". */
  saved: `${Math.floor((1 - each20 / each10) * 100)}%`,
} as const;
