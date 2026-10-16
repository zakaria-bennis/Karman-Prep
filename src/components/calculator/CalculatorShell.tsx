"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { ClipboardPaste, Keyboard, Maximize2, Minimize2, X } from "lucide-react";
import type { CalculatorInstance, CalculatorMode } from "@/lib/calculator/types";
import {
  IMPORTED_TABLE,
  insertPayload,
  parseText,
  parseTransfer,
  readClipboard,
  type PastePayload,
} from "@/lib/calculator/paste";
import { CalculatorSurface } from "./CalculatorSurface";
import styles from "./calculator.module.css";

export function CalculatorShell({
  open,
  mobile,
  docked,
  dark,
  onClose,
  request,
  onConsume,
}: {
  open: boolean;
  mobile: boolean;
  docked: boolean;
  dark: boolean;
  onClose(): void;
  request: { payload: PastePayload } | null;
  onConsume(): void;
}) {
  const [mode, setMode] = useState<CalculatorMode>("graphing");
  const [scientificVisited, setScientificVisited] = useState(false);
  const [keypad, setKeypad] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [position, setPosition] = useState({ x: 16, y: 64 });
  const [error, setError] = useState("");
  const [manualPaste, setManualPaste] = useState(false);
  const [text, setText] = useState("");
  const [pointsAsTable, setPointsAsTable] = useState(false);
  const [hasTable, setHasTable] = useState(false);
  const [revision, setRevision] = useState(0);
  const shell = useRef<HTMLDivElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const instances = useRef<Partial<Record<CalculatorMode, CalculatorInstance>>>({});
  const alive = useRef(true);
  const queued = useRef<PastePayload | null>(null);
  const onReady = useCallback((which: CalculatorMode, calc: CalculatorInstance | null) => {
    if (calc) {
      instances.current[which] = calc;
      if (which === "graphing")
        calc.subscribe(() => {
          if (alive.current)
            setHasTable(calc.getExpressions().some((e) => e.id === IMPORTED_TABLE));
        });
      setRevision((n) => n + 1);
    } else delete instances.current[which];
  }, []);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      queued.current = null;
    };
  }, []);
  useEffect(() => {
    if (shell.current) shell.current.inert = !open;
    if (open) close.current?.focus();
  }, [open]);
  useEffect(() => {
    if (mobile || maximized) return;
    const clamp = () => {
      const box = shell.current?.getBoundingClientRect();
      if (box)
        setPosition((p) => ({
          x: Math.max(0, Math.min(p.x, innerWidth - box.width)),
          y: Math.max(0, Math.min(p.y, innerHeight - box.height)),
        }));
    };
    const resize = new ResizeObserver(clamp);
    if (shell.current) resize.observe(shell.current);
    window.addEventListener("resize", clamp);
    window.visualViewport?.addEventListener("resize", clamp);
    return () => {
      resize.disconnect();
      window.removeEventListener("resize", clamp);
      window.visualViewport?.removeEventListener("resize", clamp);
    };
  }, [mobile, maximized]);
  const importPayload = useCallback(
    (payload: PastePayload) => {
      setMode("graphing");
      const calc = instances.current.graphing;
      if (!calc) {
        queued.current = payload;
        return;
      }
      try {
        insertPayload(calc, payload, pointsAsTable);
        setError("");
        setManualPaste(false);
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Could not paste math.");
      }
    },
    [pointsAsTable]
  );
  useEffect(() => {
    if (request) {
      importPayload(request.payload);
      onConsume();
    }
  }, [request, importPayload, onConsume]);
  useEffect(() => {
    if (queued.current && instances.current.graphing) {
      const payload = queued.current;
      queued.current = null;
      importPayload(payload);
    }
  }, [revision, importPayload]);
  async function pasteClipboard() {
    try {
      const payload = await readClipboard();
      if (alive.current) importPayload(payload);
    } catch (reason) {
      if (alive.current) {
        setError(reason instanceof Error ? reason.message : "Use the text box to paste your math.");
        setManualPaste(true);
      }
    }
  }
  // Validate rich clipboard imports before native text editing handles them.
  useEffect(() => {
    const node = shell.current;
    if (!node) return;
    const paste = (event: ClipboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest("[data-manual-paste]")) return;
      if (!event.clipboardData) return;
      try {
        const payload = parseTransfer(event.clipboardData);
        // Preserve native caret/selection editing for safe math pasted into an
        // editor. Tables and points go through the canonical import policy.
        if (payload.kind === "math" && target.closest('textarea,input,[contenteditable="true"]'))
          return;
        event.preventDefault();
        event.stopImmediatePropagation();
        importPayload(payload);
      } catch (reason) {
        event.preventDefault();
        event.stopImmediatePropagation();
        setError((reason as Error).message);
      }
    };
    const drop = (event: DragEvent) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      setError("Drop is disabled. Use Paste for math or a two-column table.");
    };
    node.addEventListener("paste", paste, true);
    node.addEventListener("drop", drop, true);
    return () => {
      node.removeEventListener("paste", paste, true);
      node.removeEventListener("drop", drop, true);
    };
  }, [importPayload]);
  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (mobile || maximized || (event.target as HTMLElement).closest("button,select,label")) return;
    const node = shell.current;
    if (!node) return;
    const bounds = node.getBoundingClientRect();
    const startX = event.clientX,
      startY = event.clientY;
    const handle = event.currentTarget;
    handle.setPointerCapture(event.pointerId);
    const move = (e: globalThis.PointerEvent) =>
      setPosition({
        x: Math.max(0, Math.min(innerWidth - bounds.width, bounds.left + e.clientX - startX)),
        y: Math.max(0, Math.min(innerHeight - bounds.height, bounds.top + e.clientY - startY)),
      });
    const end = () => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("lostpointercapture", end);
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("lostpointercapture", end);
  }
  return (
    <div
      ref={shell}
      hidden={!open}
      role="dialog"
      aria-modal={mobile || undefined}
      aria-label="Karman calculator"
      data-calculator-shell
      data-theme={dark ? "dark" : "light"}
      className={`${styles.shell} ${mobile ? styles.mobile : maximized ? styles.maximized : docked ? styles.docked : ""}`}
      style={mobile || maximized ? undefined : { left: position.x, top: position.y }}
      onKeyDownCapture={(event) => {
        if (
          mode === "graphing" &&
          event.key.toLowerCase() === "k" &&
          (event.ctrlKey || event.altKey)
        ) {
          event.preventDefault();
          event.stopPropagation();
          setKeypad((v) => !v);
        }
        if (mobile && event.key === "Tab") {
          const focusable = [
            ...(shell.current?.querySelectorAll<HTMLElement>(
              'button:not([disabled]),select,textarea,input,[tabindex="0"]'
            ) ?? []),
          ].filter((el) => el.getClientRects().length && !el.closest("[hidden]"));
          const first = focusable[0],
            last = focusable.at(-1);
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }
      }}
      onKeyDown={(event) => {
        if (
          event.key === "Escape" &&
          !event.defaultPrevented &&
          !shell.current?.querySelector('[aria-expanded="true"]')
        )
          onClose();
        // Quiz-level shortcuts must not consume calculator events.
        event.stopPropagation();
      }}
    >
      <div className={styles.titlebar} onPointerDown={startDrag}>
        <span>Karman Calculator</span>
        <select
          aria-label="Calculator mode"
          value={mode}
          onChange={(event) => {
            setMode(event.target.value as CalculatorMode);
            if (event.target.value === "scientific") setScientificVisited(true);
          }}
        >
          <option value="graphing">Graphing</option>
          <option value="scientific">Scientific</option>
        </select>
        <button
          type="button"
          onClick={pasteClipboard}
          title={hasTable ? "Paste replaces imported table" : "Paste math"}
          aria-label={hasTable ? "Paste replaces imported table" : "Paste math"}
        >
          <ClipboardPaste size={16} />
        </button>
        {!mobile && (
          <button
            type="button"
            aria-label={maximized ? "Restore calculator size" : "Maximize calculator"}
            onClick={() => setMaximized((v) => !v)}
          >
            <Maximize2 size={16} />
          </button>
        )}
        {!mobile && (
          <button type="button" aria-label="Minimize calculator" onClick={onClose}>
            <Minimize2 size={16} />
          </button>
        )}
        <button ref={close} type="button" aria-label="Close calculator" onClick={onClose}>
          <X size={18} />
        </button>
      </div>
      {error && (
        <p className={styles.message} role="alert">
          {error}
        </p>
      )}
      {manualPaste && (
        <form
          className={styles.pasteForm}
          onSubmit={(event) => {
            event.preventDefault();
            try {
              importPayload(parseText(text));
            } catch (reason) {
              setError((reason as Error).message);
            }
          }}
        >
          <textarea
            data-manual-paste
            aria-label="Math to paste"
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
          <button type="submit">Insert math</button>
          <button type="button" onClick={() => setManualPaste(false)}>
            Cancel
          </button>
        </form>
      )}
      <div className={styles.surfaces}>
        <CalculatorSurface
          mode="graphing"
          dark={dark}
          mobile={mobile}
          keypad={keypad}
          visible={mode === "graphing" && open}
          onReady={onReady}
        />
        {scientificVisited && (
          <CalculatorSurface
            mode="scientific"
            dark={dark}
            mobile={mobile}
            keypad={keypad}
            visible={mode === "scientific" && open}
            onReady={onReady}
          />
        )}
      </div>
      <div className={styles.footer}>
        {mode === "graphing" && (
          <button
            type="button"
            aria-label={keypad ? "Hide calculator keypad" : "Show calculator keypad"}
            aria-pressed={keypad}
            onClick={() => setKeypad((v) => !v)}
          >
            <Keyboard size={18} /> Keypad
          </button>
        )}
        <label>
          Paste points as{" "}
          <select
            aria-label="Paste points as"
            value={pointsAsTable ? "table" : "points"}
            onChange={(event) => setPointsAsTable(event.target.value === "table")}
          >
            <option value="points">coordinates</option>
            <option value="table">x₁, y₁ table</option>
          </select>
        </label>
        {hasTable && <span>Paste replaces imported table</span>}
      </div>
    </div>
  );
}
