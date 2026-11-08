"use client";

/*
 * The fox avatar, top right. It opens the account menu: who is signed in, then a grid of big
 * tiles, each an icon and one or two words, then Sign out on its own line (founder, 2026-11-08:
 * "fun, clear and easy", generous tap targets). It springs open from the fox. Escape, a click
 * outside or a scroll closes it, and focus returns to the avatar. Arrow keys move between items.
 *
 * The menu renders into the shell itself, not inside the app bar: the bar's blur and its ink
 * (dark ink over a light painting) used to bleed into the menu and make it unreadable.
 */
import Link from "next/link";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Fox } from "./Fox";
import { PortalIcon, type PortalIconName } from "./icons";

export interface AccountMenuItem {
  /** One or two words ("Test date", "Sign out"). */
  label: string;
  icon?: PortalIconName;
  href?: string;
  onSelect?: () => void;
  /** Sign out: shown on its own line below the tiles. */
  quiet?: boolean;
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
  const [at, setAt] = useState<{ top: number; right: number } | null>(null);
  const [host, setHost] = useState<Element | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const close = useCallback((refocus = true) => {
    setOpen(false);
    if (refocus) button.current?.focus();
  }, []);

  /* Place the menu under the fox, in the shell (so it keeps the shell's colors). */
  useLayoutEffect(() => {
    if (!open || !button.current) return;
    const r = button.current.getBoundingClientRect();
    setHost(button.current.closest(".kp-shell") ?? document.body);
    setAt({ top: r.bottom + 10, right: Math.max(12, window.innerWidth - r.right) });
  }, [open]);

  useEffect(() => {
    if (!open || !at) return;
    menu.current?.querySelector<HTMLElement>("[role=menuitem]")?.focus({ preventScroll: true });
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
    const onScroll = () => close(false);
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [open, at, close]);

  const move = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const keys = ["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight", "Home", "End"];
    if (!keys.includes(e.key)) return;
    const all = Array.from(menu.current?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? []);
    if (!all.length) return;
    e.preventDefault();
    const now = all.indexOf(document.activeElement as HTMLElement);
    const step = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : -1;
    const next =
      e.key === "Home"
        ? 0
        : e.key === "End"
          ? all.length - 1
          : (now + step + all.length) % all.length;
    all[next].focus();
  };

  const tiles = items.filter((it) => !it.quiet);
  const quiet = items.filter((it) => it.quiet);

  const entry = (it: AccountMenuItem, i: number, cls: string) => {
    const body = (
      <>
        <span className="kp-tile-icon">
          <PortalIcon name={it.icon ?? "settings"} size={22} />
        </span>
        <span className="kp-tile-label">{it.label}</span>
      </>
    );
    const style = { "--i": i } as React.CSSProperties;
    return it.href ? (
      <Link
        key={it.label}
        role="menuitem"
        className={cls}
        style={style}
        href={it.href}
        tabIndex={-1}
        onClick={() => close(false)}
      >
        {body}
      </Link>
    ) : (
      <button
        key={it.label}
        type="button"
        role="menuitem"
        className={cls}
        style={style}
        tabIndex={-1}
        onClick={() => {
          close(false);
          it.onSelect?.();
        }}
      >
        {body}
      </button>
    );
  };

  return (
    <>
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
      {open &&
        at &&
        host &&
        createPortal(
          <div
            ref={menu}
            id={menuId}
            className="kp-menu"
            role="menu"
            aria-label="Account"
            style={{ top: at.top, right: at.right }}
            onKeyDown={move}
            data-paint-keepout=""
          >
            {(name || detail) && (
              <div className="kp-menu-who" role="presentation">
                <span className="kp-menu-fox" aria-hidden="true">
                  <Fox size={44} />
                </span>
                <span>
                  {name && <b>{name}</b>}
                  {detail && <small>{detail}</small>}
                </span>
              </div>
            )}
            <div className="kp-menu-grid">{tiles.map((it, i) => entry(it, i, "kp-tile"))}</div>
            {quiet.map((it, i) => entry(it, tiles.length + i, "kp-tile kp-tile-quiet"))}
          </div>,
          host
        )}
    </>
  );
}
