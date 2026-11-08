import { Icon, ICON_NAMES } from "@/design-system/icons";
import {
  Token,
  TokenCount,
  MysteryBox,
  Flame,
  Streak,
  LevelMark,
  LevelBar,
  BANDS,
  Medal,
  CompanionHead,
  CompanionBody,
  ACCESSORIES,
  ACCESSORY_NAMES,
  AccessoryIcon,
  type AccessoryId,
  type Band,
} from "@/design-system/marks";
import { Panel } from "@/design-system/glass/Panel";
import { Section, Sub } from "./System";

export function SystemIcons() {
  return (
    <Section
      id="icons"
      title="Icons and marks"
      intro="One stroke set on a 24 grid at 1.75 with round caps and joins, drawn for Karman, rendered at 24 and 20 px only. The marks are a separate filled set: the gold token and medal keep their fixed gold in every theme; the box, flame and level mark take the accent."
    >
      <Sub title={`Icons, ${ICON_NAMES.length} of them`}>
        <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
          {ICON_NAMES.map((n) => (
            <li key={n} className="grid justify-items-center gap-1 rounded-card py-3 text-center">
              <span className="flex h-11 items-center gap-3">
                <Icon name={n} size={24} />
                <Icon name={n} size={20} className="text-muted" />
              </span>
              <span className="text-small text-muted">{n}</span>
            </li>
          ))}
        </ul>
      </Sub>
      <Sub title="Marks">
        <Panel className="grid gap-6 p-5">
          <div className="flex flex-wrap items-end gap-6">
            <span className="grid justify-items-center gap-1">
              <Token size={36} />
              <span className="text-small text-muted">token 36</span>
            </span>
            <span className="grid justify-items-center gap-1">
              <Token size={20} />
              <span className="text-small text-muted">20</span>
            </span>
            <span className="grid justify-items-center gap-1">
              <TokenCount value={325} />
              <span className="text-small text-muted">count</span>
            </span>
            <span className="grid justify-items-center gap-1">
              <MysteryBox size={72} />
              <span className="text-small text-muted">mystery box</span>
            </span>
            <span className="grid justify-items-center gap-1">
              <Flame size={22} />
              <span className="text-small text-muted">flame</span>
            </span>
            <span className="grid justify-items-center gap-1">
              <Streak days={7} />
              <span className="text-small text-muted">streak</span>
            </span>
            <span className="grid justify-items-center gap-1">
              <Medal size={48} />
              <span className="text-small text-muted">medal</span>
            </span>
          </div>
          <div className="grid gap-2">
            {BANDS.map((b, i) => (
              <div
                key={b}
                className="grid grid-cols-[24px_120px_minmax(0,1fr)] items-center gap-3 text-dense"
              >
                <LevelMark level={i as Band} size={20} />
                <span>{b}</span>
                <LevelBar value={[0, 20, 48, 70, 92][i]} />
              </div>
            ))}
            <div className="grid grid-cols-[24px_120px_minmax(0,1fr)] items-center gap-3 text-dense">
              <LevelMark level={1} size={20} />
              <span className="text-negative">Slipped 38 to 33</span>
              <LevelBar value={33} was={38} />
            </div>
          </div>
        </Panel>
      </Sub>
      <Sub title="Companions">
        <Panel className="grid gap-5 p-5">
          <div className="flex flex-wrap items-end gap-6">
            <span className="grid justify-items-center gap-1">
              <CompanionHead animal="fox" size={96} />
              <span className="text-small text-muted">fox, neutral</span>
            </span>
            <span className="grid justify-items-center gap-1">
              <CompanionHead animal="fox" mood="h" accessory="cap" size={96} />
              <span className="text-small text-muted">fox, happy, cap</span>
            </span>
            <span className="grid justify-items-center gap-1">
              <CompanionHead animal="fox" mood="o" stage="kit" size={80} />
              <span className="text-small text-muted">fox kit, delighted</span>
            </span>
            <span className="grid justify-items-center gap-1">
              <CompanionHead animal="owl" size={96} />
              <span className="text-small text-muted">owl</span>
            </span>
            <span className="grid justify-items-center gap-1">
              <CompanionHead animal="owl" mood="h" size={96} />
              <span className="text-small text-muted">owl, happy</span>
            </span>
          </div>
          <div className="flex flex-wrap items-end gap-6">
            <span className="grid justify-items-center gap-1">
              <CompanionBody animal="fox" size={92} accessory="glasses" />
              <span className="text-small text-muted">fox body</span>
            </span>
            <span className="grid justify-items-center gap-1">
              <CompanionBody animal="owl" size={92} />
              <span className="text-small text-muted">owl body</span>
            </span>
          </div>
          <div className="flex flex-wrap items-end gap-6">
            {(Object.keys(ACCESSORIES) as AccessoryId[]).map((id) => (
              <span key={id} className="grid justify-items-center gap-1">
                <AccessoryIcon id={id} size={56} />
                <span className="text-small text-muted">{ACCESSORY_NAMES[id]}</span>
              </span>
            ))}
          </div>
        </Panel>
      </Sub>
    </Section>
  );
}
