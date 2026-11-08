"use client";

/*
 * The fox avatar, top right. It opens a small account menu; Escape or a click outside closes
 * it and focus returns to the avatar. Arrow keys move between items.
 */
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Fox } from "./Fox";

export interface AccountMenuItem {
  label: string;
  href?: string;
  onSelect?: () => void;
}

export default function AccountMenu({
  name,
  detail,
  items,
}: {
  name?: string | null;
  detail?: string | null;
  items: AccountMenuItem[];
}) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const close = useCallback((refocus = true) => {
    setOpen(false);
    if (refocus) button.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector<HTMLElement>("[role=menuitem]")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!menu.current?.contains(t) && !button.current?.contains(t)) close(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open, close]);

  const move = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
    const all = Array.from(menu.current?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? []);
    if (!all.length) return;
    e.preventDefault();
    const at = all.indexOf(document.activeElement as HTMLElement);
    const next =
      e.key === "Home"
        ? 0
        : e.key === "End"
          ? all.length - 1
          : (at + (e.key === "ArrowDown" ? 1 : -1) + all.length) % all.length;
    all[next].focus();
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        ref={button}
        type="button"
        className="kp-avatar"
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        <Fox size={40} />
      </button>
      {open && (
        <div
          ref={menu}
          id={menuId}
          className="kp-menu"
          role="menu"
          aria-label="Account"
          onKeyDown={move}
        >
          {(name || detail) && (
            <div className="kp-menu-who" role="presentation">
              {name && <b>{name}</b>}
              {detail && <small>{detail}</small>}
            </div>
          )}
          {items.map((it) =>
            it.href ? (
              <Link
                key={it.label}
                role="menuitem"
                href={it.href}
                tabIndex={-1}
                onClick={() => close(false)}
              >
                {it.label}
              </Link>
            ) : (
              <button
                key={it.label}
                type="button"
                role="menuitem"
                tabIndex={-1}
                onClick={() => {
                  close(false);
                  it.onSelect?.();
                }}
              >
                {it.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
