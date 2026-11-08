import { COLOR_TOKENS, TYPE_SCALE, RADII, Z_LAYERS, EASE } from "@/design-system/tokens";
import { SPRINGS } from "@/design-system/motion";
import { useThemeColors } from "@/design-system/theme";
import { Panel } from "@/design-system/glass/Panel";
import { Section, Sub } from "./System";

export function SystemTokens() {
  const theme = useThemeColors();
  return (
    <Section
      id="tokens"
      title="Tokens"
      intro={`The ${theme.name} theme (${theme.accentName} accent). Colours are "r g b" channels on html[data-theme], used as rgb(var(--k-name) / alpha) and as Tailwind colours of the same name.`}
    >
      <Sub title="Colour">
        <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
          {COLOR_TOKENS.map(([name, what]) => (
            <li key={name} className="flex items-start gap-3 py-1">
              <span
                className="mt-0.5 h-8 w-8 shrink-0 rounded-chip border border-line"
                style={{ background: `rgb(var(--k-${name}))` }}
                aria-hidden="true"
              />
              <span className="min-w-0 text-dense">
                <span className="block font-semibold">--k-{name}</span>
                <span className="block text-muted">{what}</span>
              </span>
            </li>
          ))}
        </ul>
      </Sub>
      <Sub title="Type">
        <Panel className="grid gap-4 p-5">
          {TYPE_SCALE.map(([name, spec, what]) => (
            <div
              key={name}
              className="grid gap-1 sm:grid-cols-[160px_minmax(0,1fr)] sm:items-baseline"
            >
              <span className="text-small text-muted">
                {name}, {spec}
              </span>
              <span className={`text-${name} tabular`}>
                {name.startsWith("kpi") ? "1,390" : what}
              </span>
            </div>
          ))}
          <div className="grid gap-1 sm:grid-cols-[160px_minmax(0,1fr)] sm:items-baseline">
            <span className="text-small text-muted">serif, question stems</span>
            <span className="font-serif text-[17px] leading-[1.6]">
              Which choice completes the text so that it conforms to the conventions of Standard
              English?
            </span>
          </div>
        </Panel>
      </Sub>
      <div className="grid gap-6 lg:grid-cols-3">
        <Sub title="Radii">
          <ul className="grid gap-2">
            {RADII.map(([name, value, what]) => (
              <li key={name} className="flex items-center gap-3 text-dense">
                <span
                  className="h-9 w-14 shrink-0 border border-border bg-raised"
                  style={{ borderRadius: value }}
                  aria-hidden="true"
                />
                <span>
                  <span className="font-semibold">{name}</span> {value}.{" "}
                  <span className="text-muted">{what}</span>
                </span>
              </li>
            ))}
          </ul>
        </Sub>
        <Sub title="Spacing and layers">
          <ul className="grid gap-2 text-dense">
            <li>
              A 4px base: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64. One gutter per screen, 16px on
              phones and 24px on desktop.
            </li>
            {Z_LAYERS.map(([name, z, what]) => (
              <li key={name} className="flex gap-3">
                <span className="tabular w-16 shrink-0 font-semibold">z {z}</span>
                <span>
                  {name}. <span className="text-muted">{what}</span>
                </span>
              </li>
            ))}
          </ul>
        </Sub>
        <Sub title="Motion">
          <ul className="grid gap-2 text-dense">
            <li>
              One easing, <span className="tabular">{EASE}</span>, for everything that is not a
              spring.
            </li>
            {Object.entries(SPRINGS).map(([name, s]) => (
              <li key={name}>
                <span className="font-semibold">{name}</span> spring, response {s.response}s,
                damping {s.damping}. Baked to CSS linear() as var(--k-spring-{name}).
              </li>
            ))}
            <li className="text-muted">
              Press feedback on press, not release. Everything interruptible. Reduced motion: fades
              instead of travel, backgrounds still, the orb slow.
            </li>
          </ul>
        </Sub>
      </div>
    </Section>
  );
}
