"use client";

// The three menus that narrow the Mistake Log (founder, 2026-11-16). They are the app's own glass, not
// the system's lists, and each takes several choices at once:
//   Activities   skill sets, the Daily 10, full-length exams and so on.
//   Domains      the eight, under their two sections. A section's own row takes all four at once.
//   Skills       opens on the eight domains only; a domain is opened to choose skills inside it.
// A menu stays open while choices are made, and closes on Escape or a press anywhere else.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { MODES_MANY, type Mode, type Sift } from "./mistakeLogData";
import styles from "./mistakeLog.module.css";
import { SECTIONS, SKILLS } from "./skills72";
import { tick } from "./sound";

const flip = <T,>(list: T[], item: T) =>
  list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
/** What a menu's button says: all of them, or how many are chosen. It never names the choice, so
 *  nothing long is ever cut short on a narrow button. */
const said = (chosen: number, all: string, one: string, many: string) =>
  chosen === 0 ? all : `${chosen} ${chosen === 1 ? one : many}`;

/** A choice that can be on with others: a small box, ticked when on, dashed when partly on. */
function Choice({
  on,
  part = false,
  strong = false,
  onPick,
  children,
}: {
  on: boolean;
  part?: boolean;
  strong?: boolean;
  onPick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="menuitemcheckbox"
      aria-checked={part ? "mixed" : on}
      className={styles.choice}
      data-strong={strong || undefined}
      onClick={() => {
        onPick();
        tick();
      }}
    >
      <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
        <rect x="2.500" y="2.500" width="15" height="15" rx="4.500" />
        {(on || part) && <path d={part ? "M6.500 10h7" : "M6 10.300l2.700 2.700L14 7.500"} />}
      </svg>
      <span>{children}</span>
    </button>
  );
}

type MenuKey = "activities" | "domains" | "skills";

export function Sifts({ sift, onSift }: { sift: Sift; onSift: (next: Sift) => void }) {
  const [open, setOpen] = useState<MenuKey | null>(null);
  /** The domain opened inside the skills menu, if any. */
  const [unfolded, setUnfolded] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    // Escape closes the menu and goes no further, so it does not also close what is open beside it
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      setOpen(null);
    };
    const away = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener("keydown", key, true);
    window.addEventListener("pointerdown", away);
    return () => {
      document.removeEventListener("keydown", key, true);
      window.removeEventListener("pointerdown", away);
    };
  }, [open]);

  const menu = (key: MenuKey, name: string, label: string, on: boolean, body: ReactNode) => (
    <div className={styles.pick} data-on={on || undefined}>
      <button
        type="button"
        className={styles.picker}
        aria-haspopup="menu"
        aria-expanded={open === key}
        onClick={() => {
          setOpen(open === key ? null : key);
          tick();
        }}
      >
        <span>{label}</span>
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path d="M6.500 9.500L12 15l5.500-5.500" />
        </svg>
      </button>
      {open === key && (
        <div className={styles.menu} role="menu" aria-label={name} data-popover>
          {body}
        </div>
      )}
    </div>
  );

  const modes = Object.keys(MODES_MANY) as Mode[];
  return (
    <div ref={root} className={styles.sift} role="group" aria-label="Narrow the log">
      {menu(
        "activities",
        "Activities",
        said(sift.modes.length, "All activities", "activity", "activities"),
        sift.modes.length > 0,
        <>
          <Choice on={!sift.modes.length} strong onPick={() => onSift({ ...sift, modes: [] })}>
            All activities
          </Choice>
          {modes.map((mode) => (
            <Choice
              key={mode}
              on={sift.modes.includes(mode)}
              onPick={() => onSift({ ...sift, modes: flip(sift.modes, mode) })}
            >
              {MODES_MANY[mode]}
            </Choice>
          ))}
        </>
      )}
      {menu(
        "domains",
        "Domains",
        said(sift.domains.length, "All domains", "domain", "domains"),
        sift.domains.length > 0,
        <>
          <Choice on={!sift.domains.length} strong onPick={() => onSift({ ...sift, domains: [] })}>
            All domains
          </Choice>
          {SECTIONS.map((section) => {
            const names = SKILLS[section].map((d) => d.name);
            const chosen = names.filter((name) => sift.domains.includes(name)).length;
            return (
              <div key={section} className={styles.block}>
                {/* a section's row takes or drops all four of its domains at once */}
                <Choice
                  on={chosen === names.length}
                  part={chosen > 0 && chosen < names.length}
                  strong
                  onPick={() =>
                    onSift({
                      ...sift,
                      domains:
                        chosen === names.length
                          ? sift.domains.filter((name) => !names.includes(name))
                          : [...new Set([...sift.domains, ...names])],
                    })
                  }
                >
                  {section}
                </Choice>
                <div className={styles.inset}>
                  {names.map((name) => (
                    <Choice
                      key={name}
                      on={sift.domains.includes(name)}
                      onPick={() => onSift({ ...sift, domains: flip(sift.domains, name) })}
                    >
                      {name}
                    </Choice>
                  ))}
                </div>
              </div>
            );
          })}
        </>
      )}
      {menu(
        "skills",
        "Skills",
        said(sift.skills.length, "All skills", "skill", "skills"),
        sift.skills.length > 0,
        <>
          <Choice on={!sift.skills.length} strong onPick={() => onSift({ ...sift, skills: [] })}>
            All skills
          </Choice>
          {SECTIONS.map((section) => (
            <div key={section} className={styles.block}>
              <h3>{section}</h3>
              {SKILLS[section].map((domain) => {
                const chosen = domain.skills.filter((s) => sift.skills.includes(s.name)).length;
                const isOpen = unfolded === domain.name;
                return (
                  <div key={domain.name}>
                    {/* the menu shows domains only; a domain opens to its own skills */}
                    <button
                      type="button"
                      className={styles.fold}
                      aria-expanded={isOpen}
                      onClick={() => {
                        setUnfolded(isOpen ? null : domain.name);
                        tick();
                      }}
                    >
                      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                        <path d="M9.500 6.500l5.500 5.500-5.500 5.500" />
                      </svg>
                      <span>{domain.name}</span>
                      {chosen > 0 && <b>{chosen}</b>}
                    </button>
                    {isOpen && (
                      <div className={styles.inset}>
                        {domain.skills.map((skill) => (
                          <Choice
                            key={skill.name}
                            on={sift.skills.includes(skill.name)}
                            onPick={() =>
                              onSift({ ...sift, skills: flip(sift.skills, skill.name) })
                            }
                          >
                            {skill.name}
                          </Choice>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
