"use client";

import { useEffect, useRef, useState } from "react";
import type { CalculatorInstance, CalculatorMode } from "@/lib/calculator/types";
import { CALCULATOR_BUILD } from "./standalone-build";
import styles from "./calculator.module.css";

interface StandaloneEngine extends CalculatorInstance {
  root: HTMLElement;
  setTheme(theme: "light" | "dark"): void;
  setKeypad(open: boolean): void;
  resize(): void;
  clearGraphExpressionsData(): void;
  destroy(): void;
}
declare global {
  interface Window {
    KarmanGraphingEngine?: new (canvas: HTMLCanvasElement) => StandaloneEngine;
    KarmanEngineInstance?: StandaloneEngine;
  }
}
let bundle: Promise<{ html: string; css: string }> | undefined;
function loadBundle() {
  if (!bundle) {
    const base = "/karman-calculator/";
    const read = async (file: string) => {
      const response = await fetch(`${base}${file}?v=${CALCULATOR_BUILD}`);
      if (!response.ok) throw new Error("The calculator could not load. Please retry.");
      return response.text();
    };
    bundle = Promise.all([
      read("index.html"),
      read("style.css"),
      new Promise<void>((resolve, reject) => {
        if (window.KarmanGraphingEngine) return resolve();
        const script = document.createElement("script");
        script.charset = "utf-8";
        script.src = `${base}calculator.js?v=${CALCULATOR_BUILD}`;
        script.onload = () => resolve();
        script.onerror = () => {
          script.remove();
          reject(new Error("The calculator script could not load."));
        };
        document.head.append(script);
      }),
    ])
      .then(([html, css]) => ({ html, css }))
      .catch((error) => {
        bundle = undefined;
        throw error;
      });
  }
  return bundle;
}
/** Both quiz flows mount the exact standalone distribution, isolated from site CSS. */
export function CalculatorSurface({
  mode,
  dark,
  keypad,
  visible,
  onReady,
  onKeypadChange,
}: {
  mode: CalculatorMode;
  dark: boolean;
  mobile: boolean;
  keypad: boolean;
  visible: boolean;
  onReady: (mode: CalculatorMode, instance: CalculatorInstance | null) => void;
  onKeypadChange: (open: boolean) => void;
}) {
  const mount = useRef<HTMLDivElement>(null);
  const engine = useRef<StandaloneEngine | null>(null);
  const latest = useRef({ dark, keypad, visible, onReady, onKeypadChange });
  latest.current = { dark, keypad, visible, onReady, onKeypadChange };
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let disposed = false;
    const host = mount.current!;
    const shadow = host.shadowRoot ?? host.attachShadow({ mode: "open" });
    const changed = (event: Event) =>
      mode === "graphing" && latest.current.onKeypadChange((event as CustomEvent<boolean>).detail);
    host.addEventListener("karmankeypadchange", changed);
    void loadBundle()
      .then(({ html, css }) => {
        if (disposed) return;
        const document = new DOMParser().parseFromString(html, "text/html");
        const app = document.getElementById("karman-calculator");
        if (!app || !window.KarmanGraphingEngine)
          throw new Error("The calculator bundle is incomplete.");
        app.dataset.embedded = "true";
        app.dataset.mode = mode;
        app.setAttribute("role", "application");
        app.setAttribute("aria-label", `Karman ${mode} calculator`);
        const style = window.document.createElement("style");
        style.textContent = css;
        shadow.replaceChildren(style, app);
        const instance = new window.KarmanGraphingEngine(app.querySelector("canvas")!);
        engine.current = instance;
        instance.setTheme(latest.current.dark ? "dark" : "light");
        instance.setKeypad(mode === "scientific" || latest.current.keypad);
        instance.resize();
        if (latest.current.visible) window.KarmanEngineInstance = instance;
        latest.current.onReady(mode, instance);
        setReady(true);
      })
      .catch((reason) => {
        if (!disposed) setError(reason.message);
      });
    return () => {
      disposed = true;
      host.removeEventListener("karmankeypadchange", changed);
      latest.current.onReady(mode, null);
      engine.current?.clearGraphExpressionsData();
      engine.current?.destroy();
      engine.current = null;
      shadow.replaceChildren();
    };
  }, [mode, retry]);
  useEffect(() => {
    engine.current?.setTheme(dark ? "dark" : "light");
  }, [dark]);
  useEffect(() => {
    engine.current?.setKeypad(mode === "scientific" || keypad);
  }, [mode, keypad]);
  useEffect(() => {
    if (visible && engine.current) {
      engine.current.resize();
      window.KarmanEngineInstance = engine.current;
    }
  }, [visible]);
  return (
    <div className={styles.surface} hidden={!visible} data-calculator-engine="standalone">
      <div ref={mount} className={styles.mount} />
      {!ready && (
        <div className={styles.loading} role="status">
          {error || "Loading calculator…"}
          {error && (
            <button
              onClick={() => {
                setError("");
                setRetry((n) => n + 1);
              }}
            >
              Retry calculator
            </button>
          )}
        </div>
      )}
    </div>
  );
}
