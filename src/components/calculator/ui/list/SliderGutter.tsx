// A slider row's gutter controls (SLIDERS-29, VIS-37): the round Play / Pause button where other
// rows have their colour icon, and under it the loop-mode button that opens the options popover.
// A click toggles playback; Shift+click, a long press, a right-click or Shift+F10 on the Play
// button opens the popover instead. Both buttons carry real aria-labels: "Play a Animation" /
// "Pause a Animation", and the current mode's name ("Loop forwards and backwards"). Play is the
// row's last tab stop; the mode button is reached by pointer or from Play's menu keys.

import { useRef, useState, type JSX, type RefObject } from "react";
import { togglePlay } from "@/lib/calculator/core/api/sliders";
import { playOnceDone } from "@/lib/calculator/sliders/animation";
import { LOOP_MODE_LABELS } from "@/lib/calculator/sliders/model";
import type { SliderView } from "@/lib/calculator/sliders/slider";
import { useAnnouncer } from "../a11y/announcer";
import { useEngine } from "../hooks/use-engine";
import { useMenuTrigger } from "./menu-trigger";
import { SliderOptionsMenu } from "./SliderOptionsMenu";
import { LoopModeGlyph, PauseGlyph, PlayGlyph } from "./slider-glyphs";

export function SliderGutter(props: {
  rowId: string;
  name: string; // display name ("a", "a_1")
  slider: SliderView;
  playRef?: RefObject<HTMLButtonElement>;
  onTabOut?(direction: "forward" | "back"): void; // SLIDERS-25: Tab and Shift+Tab from Play
}): JSX.Element {
  const { rowId, name, slider } = props;
  const engine = useEngine();
  const announcer = useAnnouncer();
  const own = useRef<HTMLButtonElement>(null);
  const play = props.playRef ?? own;
  const opener = useRef<HTMLButtonElement>(null);
  const [menuFrom, setMenuFrom] = useState<RefObject<HTMLElement | null> | null>(null);
  const { settings } = slider;
  // SLIDERS-31: Play once at its end keeps isPlaying but shows the play icon (the label stays).
  const playing = settings.isPlaying;
  const showPause = playing && !playOnceDone(settings.loopMode, slider.value, slider.range);
  const menu = useMenuTrigger(() => setMenuFrom(play));

  const toggle = () => {
    const done = playOnceDone(settings.loopMode, slider.value, slider.range);
    togglePlay(engine, rowId, performance.now());
    announcer.announce(
      playing && !done ? `${name} paused` : done ? `${name} restarted` : `${name} playing`
    );
  };

  return (
    <div className="kc-slider-gutter">
      <button
        type="button"
        ref={play}
        className="kc-slider-play"
        aria-label={`${playing ? "Pause" : "Play"} ${name} Animation`}
        aria-haspopup="dialog"
        aria-expanded={menuFrom !== null}
        data-playing={showPause ? "true" : undefined}
        onClick={(e) => {
          if (menu.consumeClick()) return;
          if (e.shiftKey) setMenuFrom(play);
          else toggle();
        }}
        onMouseDown={(e) => e.preventDefault()}
        {...menu.trigger}
        onKeyDown={(e) => {
          if (e.key === "Tab" && props.onTabOut !== undefined) {
            e.preventDefault();
            props.onTabOut(e.shiftKey ? "back" : "forward");
            return;
          }
          menu.trigger.onKeyDown(e);
        }}
      >
        <span className="kc-slider-play-ring" aria-hidden="true">
          {showPause ? <PauseGlyph size={10.4} /> : <PlayGlyph size={10.4} />}
        </span>
      </button>
      <button
        type="button"
        ref={opener}
        className="kc-slider-mode"
        tabIndex={-1} // not a tab stop, as the reference; Shift+Enter or Shift+F10 on Play opens it
        aria-label={LOOP_MODE_LABELS[settings.loopMode]}
        aria-haspopup="dialog"
        aria-expanded={menuFrom !== null}
        onClick={() => setMenuFrom(menuFrom === null ? play : null)}
        onMouseDown={(e) => e.preventDefault()}
      >
        <LoopModeGlyph mode={settings.loopMode} size={14.56} />
      </button>
      {menuFrom !== null && (
        <SliderOptionsMenu
          rowId={rowId}
          name={name}
          settings={settings}
          anchor={play}
          opener={opener}
          onClose={(refocus) => {
            setMenuFrom(null);
            if (refocus) play.current?.focus(); // SLIDERS-34: Escape returns to the Play button
          }}
        />
      )}
    </div>
  );
}
