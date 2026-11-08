import { useId } from "react";
import { cn } from "@/design-system/cn";
import { THEMES } from "@/design-system/themes";
import { useTheme } from "@/design-system/theme";

/*
 * The theme picker: the 12 account themes as swatches, each a disc of the
 * theme's canvas with its accent inside, plus "Follow my device". Ported from
 * Animated Color Selector (21st.dev 33373, starc007): a fieldset of sr-only
 * radio inputs under 44px swatches, a selection ring that moves to the chosen
 * one, press feedback and arrow keys from the native radio group. Its
 * motion library is replaced by one transform transition on the quick
 * spring. The choice is remembered on this device.
 */
export function ThemePicker() {
  const theme = useTheme();
  const name = useId();
  const current = theme.theme ?? "";
  const choose = (id: string) => theme.set({ theme: id || null }, true);
  const items = [
    {
      id: "",
      label: "My device",
      canvas: theme.resolved.canvas,
      accent: theme.resolved.accent,
      dark: theme.resolved.dark,
    },
    ...THEMES.map((t) => ({
      id: t.id,
      label: t.name,
      canvas: t.canvas,
      accent: t.accent,
      dark: t.dark,
    })),
  ];
  return (
    <fieldset className="min-w-0 border-0 p-0">
      <legend className="pb-3 text-dense text-muted">Theme</legend>
      <div className="grid grid-cols-4 gap-x-2 gap-y-4 sm:grid-cols-7">
        {items.map((t) => {
          const on = current === t.id;
          return (
            <label
              key={t.id || "device"}
              className="grid cursor-pointer justify-items-center gap-1.5 text-center"
            >
              <input
                type="radio"
                name={name}
                value={t.id}
                checked={on}
                onChange={() => choose(t.id)}
                aria-label={t.label}
                className="peer sr-only"
              />
              <span
                aria-hidden="true"
                className={cn(
                  "relative grid h-11 w-11 place-items-center rounded-full border transition-transform duration-200 ease-k peer-active:scale-95",
                  "peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-accent",
                  t.dark ? "border-white/15" : "border-black/10"
                )}
                style={{ backgroundColor: t.canvas }}
              >
                <span className="h-5 w-5 rounded-full" style={{ backgroundColor: t.accent }} />
                <span
                  className={cn(
                    "pointer-events-none absolute -inset-1 rounded-full border-2 border-accent transition-[opacity,transform] duration-300",
                    on ? "scale-100 opacity-100" : "scale-75 opacity-0"
                  )}
                  style={{ transitionTimingFunction: "var(--k-spring-quick)" }}
                />
              </span>
              <span className={cn("text-small leading-4", on ? "text-text" : "text-muted")}>
                {t.label}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
