// The settings popover's top block (SETTINGS-9 items 1 to 3, VIS-THEMES-MODES-1, -11): the
// Display Size segments (two "A"s, 16 and 24 px), Reverse contrast, and Braille Mode. Braille Mode
// records the chosen code and six-key input and shows the reference's sub-panel, but Karman has no
// Braille input yet (A11Y-15), so the rows still show print math; the note says so.

import { useId, type JSX } from "react";
import type { BrailleMode } from "@/lib/calculator/core/api/types";
import { useEngine, useEngineSnapshot } from "../hooks/use-engine";
import { SettingCheck, SettingSegments } from "./controls";

const SIZES = [
  { value: "default", label: "Display size: default", icon: <span data-size="default">A</span> },
  { value: "large", label: "Display size: large", icon: <span data-size="large">A</span> },
] as const;

const CODES = [
  { value: "nemeth", label: "Nemeth" },
  { value: "ueb", label: "UEB" },
] as const;

export function DisplaySection(): JSX.Element {
  const engine = useEngine();
  const { settings } = useEngineSnapshot(engine);
  const id = useId();
  const braille = settings.brailleMode !== "none";
  return (
    <div className="kc-settings-display">
      <SettingSegments
        name={`${id}-size`}
        label="Display Size"
        theme="letters"
        options={SIZES}
        value={settings.displaySize}
        onSelect={(displaySize) => engine.updateSettings({ displaySize })}
      />
      <div className="kc-settings-display-checks">
        <SettingCheck
          label="Reverse contrast"
          checked={settings.reverseContrast}
          onChange={(reverseContrast) => engine.updateSettings({ reverseContrast })}
        />
        <SettingCheck
          label="Braille Mode"
          checked={braille}
          onChange={(on) => engine.updateSettings({ brailleMode: on ? "nemeth" : "none" })}
        />
      </div>
      {braille && (
        <div className="kc-settings-braille">
          <SettingSegments
            name={`${id}-braille`}
            label="Braille Mode"
            theme="small"
            options={CODES}
            value={settings.brailleMode as Exclude<BrailleMode, "none">}
            onSelect={(brailleMode) => engine.updateSettings({ brailleMode })}
          />
          <SettingCheck
            label="Six Key Braille Input"
            checked={settings.sixKeyInput}
            onChange={(sixKeyInput) => engine.updateSettings({ sixKeyInput })}
          />
          <p className="kc-settings-note">
            Use a refreshable Braille display, or just type Braille with a keyboard. Braille input
            is not available in this calculator yet.
          </p>
        </div>
      )}
    </div>
  );
}
