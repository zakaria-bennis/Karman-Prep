// The settings popover's Theme picker (founder decisions 2026-10-22 and 2026-10-26): one button
// showing the current theme's swatch and name, which opens a list of every theme: Dark (the auto choice: the site
// or quiz theme) and Classic, then the ten Light and the ten Dark themes under their group names.
// Each option is a small swatch of our own drawing (the skin's paper, a keypad stripe and an
// accent dot) and the theme's name. It follows the select-only combobox pattern: the button is a
// combobox; Enter, Space, Alt+Down or the arrow keys open the list on the current theme; arrows,
// Home, End and typed letters move through it; Enter or Space picks and closes; Escape or Tab
// closes without picking. A pick applies at once and is remembered on the device (KarmanCalculator
// through ThemeChoiceContext). Only CSS variables and the shell's skin change, so the expressions
// and the view stay as they are. The list opens below the button, or above it when the settings
// body has more room there, and never taller than that room.

import {
  createContext,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type JSX,
  type KeyboardEvent,
} from "react";
import {
  skinForChoice,
  themeChoiceName,
  THEME_CHOICES,
  THEME_GROUPS,
  type ThemeChoice,
} from "@/lib/calculator/theme/choice";
import { SKIN_COLORS } from "@/lib/calculator/theme/skin-colors.generated";
import { EscapeContext } from "../focus/escape-stack";

export interface ThemeChoiceValue {
  choice: ThemeChoice;
  choose(choice: ThemeChoice): void;
}

/** Provided by App from the shell store; absent (no Theme section) on harness pages. */
export const ThemeChoiceContext = createContext<ThemeChoiceValue | null>(null);

/** The swatch colours of a choice; the auto choice (Dark) shows the skin it gives now. */
function swatchStyle(choice: ThemeChoice, siteTheme: string | undefined): CSSProperties {
  const { roles } = SKIN_COLORS[skinForChoice(choice, siteTheme)].normal;
  return {
    "--kc-swatch-paper": roles.paper,
    "--kc-swatch-key": roles.keyOperator,
    "--kc-swatch-accent": roles.accent,
    "--kc-swatch-edge": roles.boundary,
  } as CSSProperties;
}

function Swatch(props: { choice: ThemeChoice; siteTheme: string | undefined }): JSX.Element {
  return (
    <span
      className="kc-theme-swatch"
      aria-hidden="true"
      style={swatchStyle(props.choice, props.siteTheme)}
    />
  );
}

/** A chevron pointing down (our own drawing). */
function ChevronGlyph(): JSX.Element {
  return (
    <svg className="kc-theme-chevron" viewBox="0 0 12 12" aria-hidden="true" focusable="false">
      <path d="M2.5 4.5 6 8l3.5-3.5" />
    </svg>
  );
}

/** A tick for the chosen option (our own drawing). */
function TickGlyph(): JSX.Element {
  return (
    <svg className="kc-theme-tick" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="M3.5 8.4 6.6 11.4 12.5 5" />
    </svg>
  );
}

const ROW_GAP = 6; // between the button and the list

export function ThemeSection(): JSX.Element | null {
  const theme = useContext(ThemeChoiceContext);
  const escape = useContext(EscapeContext);
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<ThemeChoice>("auto");
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const typed = useRef({ text: "", at: 0 });
  // True from a press on the list until its click, so the button's blur (a touch press moves
  // focus on some phones) does not close the list under the finger.
  const pressing = useRef(false);
  const siteTheme = globalThis.document?.documentElement.dataset.theme;
  const optionId = (choice: ThemeChoice) => `${id}-option-${choice}`;

  // Place the list where the settings body has the most room, and fit it there.
  useLayoutEffect(() => {
    const list = listRef.current;
    const button = buttonRef.current;
    const area = button?.closest(".kc-settings-body");
    if (!open || !list || !button || !area) return;
    const a = area.getBoundingClientRect();
    const b = button.getBoundingClientRect();
    const below = a.bottom - b.bottom - ROW_GAP - 4;
    const above = b.top - a.top - ROW_GAP - 4;
    const up = below < 240 && above > below;
    list.dataset.side = up ? "above" : "below";
    list.style.maxHeight = `${Math.max(120, up ? above : below)}px`;
  }, [open]);

  // Keep the active option in view, scrolling only the list (never the popover or the page).
  useLayoutEffect(() => {
    const list = listRef.current;
    const option = list?.querySelector<HTMLElement>(`[data-theme-choice="${active}"]`);
    if (!open || !list || !option) return;
    const top = option.offsetTop - 4;
    const bottom = option.offsetTop + option.offsetHeight + 4;
    if (top < list.scrollTop) list.scrollTop = top;
    else if (bottom > list.scrollTop + list.clientHeight)
      list.scrollTop = bottom - list.clientHeight;
  }, [open, active]);

  useEffect(() => {
    if (!open || escape === null) return;
    return escape.push({
      id: "theme-menu",
      close() {
        setOpen(false);
        buttonRef.current?.focus();
      },
    });
  }, [open, escape]);

  // A press outside the button and the list closes it.
  useEffect(() => {
    const button = buttonRef.current;
    const list = listRef.current;
    if (!open || !button || !list) return;
    const doc = button.ownerDocument;
    const onDown = (event: PointerEvent) => {
      const path = event.composedPath();
      if (path.includes(button) || path.includes(list)) return;
      pressing.current = false;
      setOpen(false);
    };
    doc.addEventListener("pointerdown", onDown, true);
    return () => doc.removeEventListener("pointerdown", onDown, true);
  }, [open]);

  if (theme === null) return null;

  const show = (at: ThemeChoice) => {
    setActive(at);
    setOpen(true);
  };
  const pick = (choice: ThemeChoice) => {
    theme.choose(choice);
    setOpen(false);
    buttonRef.current?.focus();
  };
  const move = (from: ThemeChoice, by: number | "first" | "last") => {
    const i = THEME_CHOICES.indexOf(from);
    const next =
      by === "first"
        ? 0
        : by === "last"
          ? THEME_CHOICES.length - 1
          : Math.min(THEME_CHOICES.length - 1, Math.max(0, i + by));
    setActive(THEME_CHOICES[next]);
  };
  // Type-ahead: letters typed within a second find the next theme whose name starts with them; the
  // same letter again moves on to the next theme starting with it.
  const typeAhead = (key: string) => {
    const now = Date.now();
    const typedText = (now - typed.current.at > 1000 ? "" : typed.current.text) + key.toLowerCase();
    typed.current = { text: typedText, at: now };
    const repeated = [...typedText].every((c) => c === typedText[0]);
    const text = repeated ? typedText[0] : typedText;
    const start = THEME_CHOICES.indexOf(active) + (text.length === 1 ? 1 : 0);
    for (let k = 0; k < THEME_CHOICES.length; k++) {
      const choice = THEME_CHOICES[(start + k) % THEME_CHOICES.length];
      if (themeChoiceName(choice).toLowerCase().startsWith(text)) return choice;
    }
    return null;
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const { key, altKey } = event;
    const handled = () => {
      event.preventDefault();
      event.stopPropagation();
    };
    if (!open) {
      if (key === "Enter" || key === " " || key === "ArrowDown" || key === "ArrowUp") {
        handled();
        show(theme.choice);
      } else if (key === "Home" || key === "End") {
        handled();
        show(key === "Home" ? THEME_CHOICES[0] : THEME_CHOICES[THEME_CHOICES.length - 1]);
      } else if (key.length === 1 && /\S/.test(key) && !event.metaKey && !event.ctrlKey) {
        const found = typeAhead(key);
        if (found !== null) {
          handled();
          show(found);
        }
      }
      return;
    }
    if (key === "ArrowDown") {
      handled();
      move(active, 1);
    } else if (key === "ArrowUp") {
      handled();
      if (altKey) pick(active);
      else move(active, -1);
    } else if (key === "Home" || key === "PageUp") {
      handled();
      move(active, key === "Home" ? "first" : -10);
    } else if (key === "End" || key === "PageDown") {
      handled();
      move(active, key === "End" ? "last" : 10);
    } else if (key === "Enter" || key === " ") {
      handled();
      pick(active);
    } else if (key === "Tab") {
      setOpen(false);
    } else if (key.length === 1 && /\S/.test(key) && !event.metaKey && !event.ctrlKey) {
      const found = typeAhead(key);
      if (found !== null) {
        handled();
        setActive(found);
      }
    }
  };

  return (
    <div className="kc-settings-section kc-settings-theme">
      <div className="kc-theme-row">
        <span className="kc-settings-theme-title" id={`${id}-title`}>
          Theme
        </span>
        <button
          ref={buttonRef}
          type="button"
          className="kc-theme-button"
          role="combobox"
          aria-labelledby={`${id}-title ${id}-value`}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-activedescendant={open ? optionId(active) : undefined}
          onClick={() => (open ? setOpen(false) : show(theme.choice))}
          onKeyDown={onKeyDown}
          onBlur={(event) => {
            const next = event.relatedTarget;
            if (pressing.current) return;
            if (!(next instanceof Node) || !listRef.current?.contains(next)) setOpen(false);
          }}
        >
          <Swatch choice={theme.choice} siteTheme={siteTheme} />
          <span className="kc-theme-value" id={`${id}-value`}>
            {themeChoiceName(theme.choice)}
          </span>
          <ChevronGlyph />
        </button>
      </div>
      <div
        ref={listRef}
        className="kc-theme-list"
        id={`${id}-list`}
        role="listbox"
        aria-labelledby={`${id}-title`}
        tabIndex={-1}
        hidden={!open}
        onPointerDown={(event) => {
          pressing.current = true;
          // A mouse press keeps focus on the button; WebKit drops a touch's click if this is
          // prevented, so a touch is left alone.
          if (event.pointerType === "mouse") event.preventDefault();
        }}
        onPointerCancel={() => (pressing.current = false)}
        onClick={() => (pressing.current = false)}
      >
        {THEME_GROUPS.map((group, g) => (
          <div
            key={group.label ?? "first"}
            className="kc-theme-group"
            role="group"
            aria-labelledby={group.label === null ? undefined : `${id}-group-${g}`}
          >
            {group.label !== null && (
              <div className="kc-theme-group-label" id={`${id}-group-${g}`} role="presentation">
                {group.label}
              </div>
            )}
            {group.choices.map((choice) => (
              <div
                key={choice}
                id={optionId(choice)}
                className="kc-theme-option"
                role="option"
                aria-selected={theme.choice === choice}
                data-theme-choice={choice}
                data-active={open && active === choice ? "true" : undefined}
                onPointerMove={() => setActive(choice)}
                onClick={() => pick(choice)}
              >
                <Swatch choice={choice} siteTheme={siteTheme} />
                <span className="kc-theme-name">{themeChoiceName(choice)}</span>
                {theme.choice === choice && <TickGlyph />}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
