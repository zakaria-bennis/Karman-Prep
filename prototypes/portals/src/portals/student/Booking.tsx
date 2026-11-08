import { useId, useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@/design-system/cn";
import { Sheet } from "@/design-system/components/Sheet";
import { PrimaryButton } from "./PrimaryButton";
import { fmtDate } from "@/mock";
import { SLOT_DAYS } from "./mock-schedule";

/*
 * Booking the next 1:1 session: a strip of days, then that day's times, as
 * two radio groups. Ported from Time Slot Picker (21st.dev 43217, klyv-ui):
 * the day strip with a free-slot dot, the slot grid, taken slots left visible
 * and struck through, arrow keys that skip them, and the timezone printed
 * under the grid. Recoloured with the tokens; its tracked uppercase weekday
 * became sentence case, and its scrolling day strip became a five-column grid
 * so every day fits at 375 (rule 28).
 */
export interface Slot {
  date: string;
  time: string;
}
const fmtTime = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h >= 12 ? "pm" : "am"}`;
};
export const slotLabel = (s: Slot) => `${fmtDate(s.date, "long")} at ${fmtTime(s.time)} ET`;

function rove(
  e: KeyboardEvent,
  i: number,
  n: number,
  step: Record<string, number>,
  ok: (i: number) => boolean,
  act: (i: number) => void
) {
  const d = step[e.key];
  if (d === undefined) return;
  e.preventDefault();
  for (let k = 1; k <= n; k++) {
    const to = (((i + d * k) % n) + n) % n;
    if (ok(to)) return act(to);
  }
}

export function SlotPicker({ value, onChange }: { value: Slot | null; onChange(s: Slot): void }) {
  const uid = useId();
  const [dayIndex, setDayIndex] = useState(() =>
    Math.max(
      0,
      SLOT_DAYS.findIndex((d) => d.date === value?.date)
    )
  );
  const dayRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const slotRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const day = SLOT_DAYS[dayIndex];
  const open = (d: (typeof SLOT_DAYS)[number]) => d.slots.filter((s) => s.available).length;
  const checkedSlot =
    value?.date === day.date ? day.slots.findIndex((s) => s.time === value.time) : -1;
  const stop = checkedSlot >= 0 ? checkedSlot : day.slots.findIndex((s) => s.available);
  return (
    <div role="group" aria-label="Choose a time" className="grid gap-4">
      <div role="radiogroup" aria-label="Day" className="grid grid-cols-5 gap-1.5">
        {SLOT_DAYS.map((d, i) => {
          const on = i === dayIndex;
          const n = open(d);
          const date = new Date(d.date + "T12:00:00");
          return (
            <button
              key={d.date}
              ref={(el) => {
                dayRefs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={`${fmtDate(d.date, "long")}, ${n === 0 ? "fully booked" : `${n} ${n === 1 ? "time" : "times"} free`}`}
              tabIndex={on ? 0 : -1}
              onClick={() => setDayIndex(i)}
              onKeyDown={(e) =>
                rove(
                  e,
                  i,
                  SLOT_DAYS.length,
                  { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 },
                  () => true,
                  (to) => {
                    setDayIndex(to);
                    dayRefs.current[to]?.focus();
                  }
                )
              }
              className={cn(
                "grid min-w-[52px] justify-items-center gap-0.5 rounded-card border px-1 py-2 transition-colors",
                on
                  ? "border-accent bg-accent text-accent-ink"
                  : "border-line bg-raised/40 text-text",
                n === 0 && !on && "text-muted"
              )}
            >
              <span className="text-small font-semibold">
                {date.toLocaleDateString("en-US", { weekday: "short" })}
              </span>
              <span className="tabular text-[16px] font-bold leading-tight">{date.getDate()}</span>
              <span
                aria-hidden="true"
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  n === 0 ? "bg-transparent" : on ? "bg-accent-ink" : "bg-accent"
                )}
              />
            </button>
          );
        })}
      </div>
      <div className="grid gap-2">
        <span id={`${uid}-day`} className="text-dense font-semibold">
          {fmtDate(day.date, "long")}
        </span>
        {open(day) === 0 ? (
          <p className="rounded-card border border-dashed border-border/60 px-4 py-5 text-center text-dense text-muted">
            No times left on this day. Try another.
          </p>
        ) : (
          <div role="radiogroup" aria-labelledby={`${uid}-day`} className="grid grid-cols-3 gap-2">
            {day.slots.map((s, i) => {
              const checked = i === checkedSlot;
              return (
                <button
                  key={s.time}
                  ref={(el) => {
                    slotRefs.current[i] = el;
                  }}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  disabled={!s.available}
                  tabIndex={i === stop ? 0 : -1}
                  onClick={() => onChange({ date: day.date, time: s.time })}
                  onKeyDown={(e) =>
                    rove(
                      e,
                      i,
                      day.slots.length,
                      { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 3, ArrowUp: -3 },
                      (k) => day.slots[k].available,
                      (to) => {
                        onChange({ date: day.date, time: day.slots[to].time });
                        slotRefs.current[to]?.focus();
                      }
                    )
                  }
                  className={cn(
                    "tabular h-11 rounded-pill border text-dense font-semibold transition-colors",
                    checked
                      ? "border-accent bg-accent text-accent-ink"
                      : "border-line bg-raised/40 text-text",
                    "disabled:cursor-not-allowed disabled:border-transparent disabled:bg-raised/60 disabled:font-medium disabled:text-muted disabled:line-through"
                  )}
                >
                  {fmtTime(s.time)}
                  {!s.available ? <span className="sr-only">, taken</span> : null}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <p className="text-small text-muted">Times shown in Eastern Time.</p>
    </div>
  );
}

export function BookingSheet({
  open,
  onClose,
  tutor,
  onBook,
}: {
  open: boolean;
  onClose(): void;
  tutor: string;
  onBook(slot: Slot): void;
}) {
  const [slot, setSlot] = useState<Slot | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <Sheet open={open} onClose={onClose} title={`Book a session with ${tutor}`} width={460}>
      <div className="grid gap-5">
        <p className="text-dense text-muted">One hour on Zoom. Cancel up to 24 hours before.</p>
        <SlotPicker value={slot} onChange={setSlot} />
        <div>
          <PrimaryButton
            disabled={!slot || busy}
            loading={busy}
            onClick={() => {
              if (!slot || busy) return;
              setBusy(true);
              // The demo's stand-in for the booking request: the orb shows after 400 ms, then the toast.
              setTimeout(() => {
                setBusy(false);
                onBook(slot);
                onClose();
              }, 900);
            }}
          >
            {slot ? `Book ${fmtDate(slot.date)}, ${fmtTime(slot.time)}` : "Pick a time"}
          </PrimaryButton>
        </div>
      </div>
    </Sheet>
  );
}
