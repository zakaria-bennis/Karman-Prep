"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Calculator } from "lucide-react";
import { useTheme } from "@/components/shared/ThemeProvider";
import type { PastePayload } from "@/lib/calculator/paste";
import { CalculatorShell } from "./CalculatorShell";
import styles from "./calculator.module.css";

export type CalculatorLoadStatus = "idle" | "loading" | "ready" | "failed";
export type CalculatorLoadFailure = "load" | "mount"; // OI-28: import() rejected, or mount/API threw

interface Bridge {
  paste(payload: PastePayload): void;
  toggle(): void;
  open: boolean;
}
const Context = createContext<Bridge | null>(null);
export const useCalculator = () => useContext(Context);

/** Key this scope by attempt + active question. Closing keeps this scope alive;
 * navigating destroys it, including pending clipboard work and native history. */
export function CalculatorScope({
  enabled,
  open,
  onOpenChange,
  children,
}: {
  enabled: boolean;
  open: boolean;
  onOpenChange(open: boolean): void;
  children: ReactNode;
}) {
  const { palette } = useTheme();
  const [mobile, setMobile] = useState(false);
  const [docked, setDocked] = useState(false);
  const [wide, setWide] = useState(false);
  const [activated, setActivated] = useState(open);
  const [request, setRequest] = useState<{ payload: PastePayload } | null>(null);
  const content = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const mobileOpener = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (typeof matchMedia === "undefined") return;
    const query = matchMedia("(max-width: 767px), (max-height: 500px)");
    const update = () => {
      setMobile(query.matches);
      setWide(innerWidth >= 1100);
    };
    update();
    query.addEventListener("change", update);
    window.addEventListener("resize", update);
    return () => {
      query.removeEventListener("change", update);
      window.removeEventListener("resize", update);
    };
  }, []);
  useEffect(() => {
    if (open) setActivated(true);
  }, [open]);
  useEffect(() => {
    if (!open) {
      const target = previousFocus.current?.isConnected
        ? previousFocus.current
        : mobileOpener.current;
      target?.focus();
    }
  }, [open]);
  function changeOpen(next: boolean) {
    if (next && !open) previousFocus.current = document.activeElement as HTMLElement;
    onOpenChange(next);
  }
  useEffect(() => {
    const node = content.current;
    if (node) node.inert = enabled && open && mobile;
    return () => {
      if (node) node.inert = false;
    };
  }, [enabled, open, mobile]);
  useEffect(() => {
    if (!enabled || !open || !mobile) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [enabled, open, mobile]);
  const bridge: Bridge | null = enabled
    ? {
        open,
        toggle: () => changeOpen(!open),
        paste: (payload) => {
          setDocked(true);
          setRequest({ payload });
          changeOpen(true);
        },
      }
    : null;
  return (
    <Context.Provider value={bridge}>
      <div
        ref={content}
        className={styles.workspace}
        aria-hidden={enabled && open && mobile ? true : undefined}
        data-calculator-docked={docked && open && wide}
        style={
          docked && open && wide
            ? {
                position: "relative",
                marginLeft: "48vw",
                width: "52vw",
                minHeight: "100%",
                height: "100%",
              }
            : { display: "contents" }
        }
      >
        {children}
      </div>
      {enabled && mobile && !open && (
        <button
          type="button"
          ref={mobileOpener}
          className={styles.sideToggle}
          aria-label="Open Karman calculator"
          onClick={() => changeOpen(true)}
        >
          <Calculator size={20} />
          <span>Calculator</span>
        </button>
      )}
      {enabled && (activated || open) && (
        <CalculatorShell
          open={open}
          mobile={mobile}
          docked={docked && open && wide}
          dark={palette.dark}
          request={request}
          onConsume={() => setRequest(null)}
          onClose={() => changeOpen(false)}
        />
      )}
    </Context.Provider>
  );
}

export function CalculatorTrigger() {
  const bridge = useCalculator();
  if (!bridge) return null;
  return (
    <button
      type="button"
      className={styles.trigger}
      onClick={bridge.toggle}
      aria-label="Toggle Karman calculator"
      aria-expanded={bridge.open}
    >
      <Calculator size={16} /> Calculator
    </button>
  );
}
