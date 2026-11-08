import { GlassToggle } from "@/design-system/glass/GlassToggle";
import { Icon } from "@/design-system/icons";
import { cn } from "@/design-system/cn";

/*
 * Recipients: who gets the weekly update by email. A row: the person, an
 * invitation's state on the second line only while there is one (rule 51),
 * and a glass toggle on the right, centred on the title line. Ported from
 * Notification Settings Field (21st.dev 26523, shadcnspace: Field,
 * FieldContent, FieldTitle, FieldDescription, FieldSeparator with a Switch);
 * the Radix switch became the design system's GlassToggle, with a check or a
 * cross in the knob so on and off differ by more than the knob's side.
 * The on track is the full accent (the design system's 35 percent tint read
 * 1.6:1 against the panel); for promotion into GlassToggle.
 */
export interface Recipient {
  id: string;
  name: string;
  you?: boolean;
  /** An invitation's state, the only second line a row gets. */
  state?: string;
  on: boolean;
}

/**
 * The toggle's on track at the full accent, and the knob rimmed in the panel
 * colour when on and in the text ink when off, so track against panel and
 * knob against track each pass 3:1 in both states, light and dark.
 */
export const TOGGLE_CONTRAST =
  "[&>button[aria-checked=true]]:bg-accent [&_.k-glass]:border-2 [&_.k-glass]:border-panel [&>button[aria-checked=false]_.k-glass]:border-text/60";

export function Recipients({
  items,
  onToggle,
  className,
}: {
  items: Recipient[];
  onToggle(id: string, on: boolean): void;
  className?: string;
}) {
  return (
    <ul className={cn("divide-y divide-line", className)}>
      {items.map((r) => (
        <li key={r.id} className="flex min-h-12 items-center gap-3 py-2">
          <span className="min-w-0 flex-1">
            <span className="block text-body font-medium">
              {r.name}
              {r.you ? <span className="font-normal text-muted"> (you)</span> : null}
            </span>
            {r.state ? <span className="block text-dense text-muted">{r.state}</span> : null}
          </span>
          <span className={cn("flex shrink-0", TOGGLE_CONTRAST)}>
            <GlassToggle
              checked={r.on}
              onChange={(on) => onToggle(r.id, on)}
              label={`Send the weekly update to ${r.name}`}
              icons={{ on: <Icon name="check" size={20} />, off: <Icon name="cross" size={20} /> }}
            />
          </span>
        </li>
      ))}
    </ul>
  );
}
