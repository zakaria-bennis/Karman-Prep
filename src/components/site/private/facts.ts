// The numbers the Private tutoring page's plans show, worked out once from offer.ts.
import { formatPrice, PRIVATE_PACKAGES } from "@/lib/marketing/offer";

const [P10, P20] = PRIVATE_PACKAGES;
const money = (n: number) =>
  Number.isInteger(n)
    ? formatPrice(n)
    : `$${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

export const PRIVATE_FACTS = {
  small: { name: P10.name, price: formatPrice(P10.price), each: money(P10.price / P10.hours) },
  large: { name: P20.name, price: formatPrice(P20.price), each: money(P20.price / P20.hours) },
} as const;
