import { useState } from "react";
import { Background, BG_LABELS, BG_RECOMMENDED } from "@/design-system/backgrounds/Background";
import { BG_VARIANTS, type BgVariant } from "@/design-system/theme";
import { GlassButton } from "@/design-system/glass/GlassButton";
import { GlassSegmented } from "@/design-system/glass/GlassSegmented";
import { GlassToggle } from "@/design-system/glass/GlassToggle";
import { Panel, Well } from "@/design-system/glass/Panel";
import { Icon } from "@/design-system/icons";
import { Section, Sub } from "./System";

function Recipe({ recipe, label }: { recipe: "refract" | "frost"; label: string }) {
  const [loading, setLoading] = useState(false);
  const [seg, setSeg] = useState("today");
  const [on, setOn] = useState(true);
  return (
    <div className="grid gap-3">
      <h4 className="text-dense font-semibold">{label}</h4>
      <div className="flex flex-wrap items-center gap-3">
        <GlassButton recipe={recipe} variant="primary">
          Start Your Daily 10
        </GlassButton>
        <GlassButton recipe={recipe}>Review the 3 you missed</GlassButton>
        <GlassButton recipe={recipe} size="sm" icon={<Icon name="download" size={20} />}>
          Download
        </GlassButton>
        <GlassButton recipe={recipe} size="icon" icon={<Icon name="plus" size={24} />}>
          Add
        </GlassButton>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <GlassButton
          recipe={recipe}
          variant="primary"
          loading={loading}
          onClick={() => {
            setLoading(true);
            setTimeout(() => setLoading(false), 2600);
          }}
        >
          {loading ? "Saving" : "Press for the orb"}
        </GlassButton>
        <GlassButton recipe={recipe} disabled>
          Not available yet
        </GlassButton>
        <GlassSegmented
          label="Range"
          value={seg}
          onChange={setSeg}
          options={[
            { value: "today", label: "Today" },
            { value: "week", label: "Week" },
            { value: "all", label: "All" },
          ]}
        />
        <GlassToggle
          label="Dark mode"
          checked={on}
          onChange={setOn}
          icons={{ off: <Icon name="sun" size={20} />, on: <Icon name="moon" size={20} /> }}
        />
      </div>
    </div>
  );
}

export function SystemGlass({ bg, onBg }: { bg: string; onBg(v: string): void }) {
  return (
    <>
      <Section
        id="backgrounds"
        title="Backgrounds"
        intro="Four worlds for behind the content (rule 49, now a choice). Each is drawn in code, moves slowly, uses under 3 percent of the pixels at 16 percent of the ink at most, and holds still under reduced motion. Contour lines is the recommended pick: it says a score going up, and it does not default to stars."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {BG_VARIANTS.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onBg(v)}
              aria-pressed={bg === v}
              className={`relative h-56 overflow-hidden rounded-panel border text-left ${bg === v ? "border-accent" : "border-line"}`}
            >
              <Background variant={v as BgVariant} hour={18} />
              <span className="absolute left-4 top-4 grid gap-0.5">
                <span className="text-body font-semibold">{BG_LABELS[v]}</span>
                <span className="text-dense text-muted">
                  {v === BG_RECOMMENDED
                    ? "Recommended pick"
                    : bg === v
                      ? "Showing now"
                      : "Tap to show"}
                </span>
              </span>
            </button>
          ))}
        </div>
      </Section>
      <Section
        id="glass"
        title="Glass and panels"
        intro="Rule 50 inside the app: buttons and controls are liquid glass, raised, with a bright top edge and a soft shadow. Panels are heavier and darker, opaque, so glass never sits on glass. Two control recipes side by side: refract (A, the 21st.dev 12460 port) bends what is behind it; frost (B) is CSS blur only, the fallback on Safari and Firefox."
      >
        <div className="grid gap-8">
          <Recipe recipe="refract" label="A. Refract: the backdrop bends at the rim" />
          <Recipe recipe="frost" label="B. Frost: CSS blur, the same edge and shadow" />
        </div>
        <Sub title="Panel on the background, control on the panel">
          <Panel className="grid gap-4 p-5">
            <p className="text-body">
              A panel is 92 percent of the surface token over the canvas with a hairline edge,
              radius 12, no sheen, no shadow. It carries reading. The one glass control on it is the
              one highlighted action.
            </p>
            <Well className="p-4 text-dense text-muted">
              A well is one more tone step for a track or a key-value list. Nothing on it is glass.
            </Well>
            <div className="flex flex-wrap items-center gap-4">
              <GlassButton variant="primary">Book the next session</GlassButton>
              <button type="button" className="min-h-tap text-body font-semibold text-accent">
                Every other action is a text link
              </button>
            </div>
          </Panel>
        </Sub>
      </Section>
    </>
  );
}
