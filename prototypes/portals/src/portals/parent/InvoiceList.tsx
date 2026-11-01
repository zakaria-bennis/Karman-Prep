import { Pill } from "@/design-system/components/Pill";
import { Icon } from "@/design-system/icons";
import { cn } from "@/design-system/cn";
import type { Charge } from "./mock-plan";

/*
 * InvoiceList: charges as rows: what it was for on the title line, its date
 * on the second (rule 51), the amount right-aligned in tabular figures, the
 * state as a pale pill, and a receipt on paid rows as one plain icon. Ported
 * from Invoice History Table (21st.dev 28473, ziegfiroyt); its table became
 * rows that keep one right edge on a phone, its saturated badges became the
 * design system's pills, and the empty state keeps the frame with one
 * sentence. Grey for what is fine: a paid charge is neutral, only a due one
 * carries colour.
 */
const TONE: Record<Charge["state"], "notice" | "neutral"> = {
  paid: "neutral",
  due: "notice",
  upcoming: "neutral",
};
const LABEL: Record<Charge["state"], string> = { paid: "Paid", due: "Due", upcoming: "Upcoming" };

export const money = (n: number) => `$${n.toLocaleString("en-US")}`;
/** "Oct 12, 2026": a charge's date, with its year, short enough for a phone row. */
const chargeDate = (iso: string) =>
  new Date(iso + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

export function InvoiceList({
  charges,
  onReceipt,
  empty = "No charges yet.",
  className,
}: {
  charges: Charge[];
  onReceipt?(c: Charge): void;
  empty?: string;
  className?: string;
}) {
  if (!charges.length)
    return (
      <p
        className={cn(
          "rounded-card border border-dashed border-border/60 px-4 py-3 text-dense text-muted",
          className
        )}
      >
        {empty}
      </p>
    );
  return (
    <ul className={cn("divide-y divide-line", className)}>
      {charges.map((c) => (
        <li key={c.id} className="flex min-h-12 items-center gap-3 py-2">
          <span className="min-w-0 flex-1">
            <span className="block text-body font-medium">{c.label}</span>
            <span className="block text-dense text-muted">{chargeDate(c.date)}</span>
          </span>
          <span className="tabular shrink-0 text-body font-medium">{money(c.amount)}</span>
          <Pill tone={TONE[c.state]}>{LABEL[c.state]}</Pill>
          {onReceipt && c.state === "paid" ? (
            <button
              type="button"
              aria-label={`Receipt for ${c.label}, ${chargeDate(c.date)}`}
              onClick={() => onReceipt(c)}
              className="-mr-2 grid h-11 w-11 shrink-0 place-items-center rounded-control text-muted hover:text-text"
            >
              <Icon name="download" size={20} />
            </button>
          ) : (
            <span className="w-9 shrink-0" aria-hidden="true" />
          )}
        </li>
      ))}
    </ul>
  );
}
