"use client";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  ListRestart,
  Plus,
  Redo2,
  Undo2,
} from "lucide-react";
import {
  DEFAULT_SETTINGS,
  newExpression,
  type CalculatorInstance,
  type CalculatorMode,
  type Expression,
} from "@/lib/calculator/types";
import { buildScene } from "@/lib/calculator/scene";
import { useCalculatorModel } from "./useCalculatorModel";
import { ExpressionRow } from "./ExpressionRow";
import { CalculatorKeypad } from "./CalculatorKeypad";
import { GraphSettings } from "./GraphSettings";
import { GraphView } from "./GraphView";
import styles from "./engine.module.css";

export default function CalculatorEngine({
  mode,
  dark,
  keypad,
  visible,
  onReady,
}: {
  mode: CalculatorMode;
  dark: boolean;
  keypad: boolean;
  visible: boolean;
  onReady: (mode: CalculatorMode, instance: CalculatorInstance | null) => void;
}) {
  const model = useCalculatorModel();
  const [settings, setSettings] = useState({ ...DEFAULT_SETTINGS });
  const [active, setActive] = useState(model.rows[0].id),
    [collapsed, setCollapsed] = useState(false),
    [menu, setMenu] = useState(false),
    [settingsOpen, setSettingsOpen] = useState(false),
    [help, setHelp] = useState(false);
  const inputs = useRef(new Map<string, HTMLTextAreaElement>());
  const rows = useDeferredValue(model.rows);
  const scene = useMemo(() => buildScene(rows, settings), [rows, settings]);
  useEffect(() => {
    onReady(mode, model.bridge);
    return () => onReady(mode, null);
  }, [mode, model.bridge, onReady]);
  useEffect(() => {
    if (!visible) setMenu(false);
  }, [visible]);
  const focus = useCallback((id: string) => {
    setActive(id);
    setCollapsed(false);
    requestAnimationFrame(() => inputs.current.get(id)?.focus());
  }, []);
  function add(type: Expression["type"] = "expression", latex = "") {
    if (model.rows.length >= 250) return;
    const row = newExpression(type),
      current = model.rows.find((e) => e.id === active);
    row.latex = latex;
    if (current?.type === "folder") row.folderId = current.id;
    else if (current?.folderId) row.folderId = current.folderId;
    if (type === "table") {
      const n = 1 + model.rows.filter((e) => e.type === "table").length;
      row.columns = [
        { latex: `x_${n}`, values: ["", "", ""] },
        { latex: `y_${n}`, values: ["", "", ""] },
      ];
    }
    model.commit([...model.rows, row]);
    setMenu(false);
    focus(row.id);
  }
  function insert(text: string) {
    let id = active,
      input = inputs.current.get(id),
      row = model.rows.find((e) => e.id === id);
    if (!row || row.type === "table" || row.type === "folder") {
      row = newExpression();
      id = row.id;
      model.bridge.setExpressions([{ ...row, latex: text }]);
      focus(id);
      return;
    }
    const start = input?.selectionStart ?? row.latex?.length ?? 0,
      end = input?.selectionEnd ?? start,
      value = row.latex ?? "";
    model.update(id, { latex: value.slice(0, start) + text + value.slice(end) }, `type-${id}`);
    focus(id);
    requestAnimationFrame(() => {
      input = inputs.current.get(id);
      input?.setSelectionRange(start + text.length, start + text.length);
    });
  }
  function command(key: string) {
    const input = inputs.current.get(active);
    if (key === "Enter") {
      add();
      return;
    }
    if (!input) return;
    if (key === "Backspace") {
      const start = input.selectionStart,
        end = input.selectionEnd,
        value = input.value;
      const from = start === end ? Math.max(0, start - 1) : start;
      model.update(active, { latex: value.slice(0, from) + value.slice(end) }, `type-${active}`);
      focus(active);
      requestAnimationFrame(() => input.setSelectionRange(from, from));
    } else {
      input.focus();
      const pos = Math.max(
        0,
        Math.min(input.value.length, input.selectionStart + (key === "ArrowLeft" ? -1 : 1))
      );
      input.setSelectionRange(pos, pos);
    }
  }
  return (
    <div
      className={`${styles.engine} ${mode === "scientific" ? styles.scientific : ""}`}
      role="application"
      aria-label={`Karman ${mode} calculator`}
      onKeyDownCapture={(event) => {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
          event.preventDefault();
          if (event.shiftKey) model.redo();
          else model.undo();
        } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") {
          event.preventDefault();
          model.redo();
        } else if (event.key === "Escape" && (menu || settingsOpen || help)) {
          event.preventDefault();
          event.stopPropagation();
          setMenu(false);
          setSettingsOpen(false);
          setHelp(false);
        }
      }}
    >
      <div className={styles.workspace}>
        {!collapsed && (
          <section className={styles.sidebar} aria-label="Expression list">
            <div className={styles.toolbar}>
              <button
                aria-label="Add item"
                title="Add item"
                aria-expanded={menu}
                onClick={() => setMenu((v) => !v)}
              >
                <Plus size={20} />
              </button>
              <button
                aria-label="Undo"
                title="Undo (Ctrl/Cmd Z)"
                disabled={!model.canUndo}
                onClick={model.undo}
              >
                <Undo2 size={19} />
              </button>
              <button
                aria-label="Redo"
                title="Redo (Ctrl/Cmd Shift Z)"
                disabled={!model.canRedo}
                onClick={model.redo}
              >
                <Redo2 size={19} />
              </button>
              <button
                aria-label="Clear all expressions"
                title="Clear all expressions"
                onClick={() => {
                  const row = newExpression();
                  model.commit([row]);
                  focus(row.id);
                }}
              >
                <ListRestart size={18} />
              </button>
              <button
                aria-label="Calculator help"
                title="Calculator help"
                aria-expanded={help}
                onClick={() => setHelp((v) => !v)}
              >
                <HelpCircle size={18} />
              </button>
              {mode === "graphing" && (
                <button
                  className={styles.collapse}
                  aria-label="Hide expression list"
                  onClick={() => setCollapsed(true)}
                >
                  <ChevronLeft size={20} />
                </button>
              )}
              {menu && (
                <div className={styles.addMenu}>
                  {(["expression", "table"] as const).map((type) => (
                    <button key={type} onClick={() => add(type)}>
                      {type[0].toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className={styles.rows}>
              {model.rows.map((row, index) => {
                if (row.folderId && model.rows.find((e) => e.id === row.folderId)?.collapsed)
                  return null;
                return (
                  <ExpressionRow
                    key={row.id}
                    row={row}
                    index={index}
                    active={active === row.id}
                    result={scene.rows[row.id] ?? {}}
                    onActive={() => setActive(row.id)}
                    inputRef={(el) => {
                      if (el) inputs.current.set(row.id, el);
                      else inputs.current.delete(row.id);
                    }}
                    onUpdate={(patch, group) => model.update(row.id, patch, group)}
                    onAdd={() => add()}
                    onRemove={() => {
                      const next = model.rows
                        .filter((e) => e.id !== row.id)
                        .map((e) => (e.folderId === row.id ? { ...e, folderId: undefined } : e));
                      if (!next.length) next.push(newExpression());
                      model.commit(next);
                      focus(next[Math.max(0, index - 1)]?.id ?? next[0].id);
                    }}
                    onMove={(direction) => {
                      const next = [...model.rows],
                        target = index + direction;
                      if (target < 0 || target >= next.length) return;
                      [next[index], next[target]] = [next[target], next[index]];
                      model.commit(next);
                    }}
                    onMissing={(names) =>
                      model.bridge.setExpressions(
                        names.map((name) => ({ ...newExpression(), latex: `${name}=1` }))
                      )
                    }
                    onFit={(type) => {
                      const x = row.columns?.[0]?.latex ?? "x_1",
                        y = row.columns?.[1]?.latex ?? "y_1",
                        formula = (
                          {
                            linear: `m*${x}+b`,
                            quadratic: `a*${x}^2+b*${x}+c`,
                            exponential: `a*b^${x}`,
                            power: `a*${x}^b`,
                            constant: "a",
                          } as Record<string, string>
                        )[type];
                      add("expression", `${y} ~ ${formula}`);
                    }}
                  />
                );
              })}
              <button className={styles.addRow} onClick={() => add()} aria-label="Add expression">
                <Plus size={16} /> Add expression
              </button>
            </div>
          </section>
        )}
        {mode === "graphing" && (
          <>
            <GraphView
              plots={scene.plots}
              settings={settings}
              onSettings={setSettings}
              dark={dark}
              onPoint={(id, x, y) => model.update(id, { latex: `(${x},${y})` }, `drag-${id}`)}
              onOpenSettings={() => setSettingsOpen((v) => !v)}
            />
            {collapsed && (
              <button
                className={styles.showList}
                aria-label="Show expression list"
                onClick={() => setCollapsed(false)}
              >
                <ChevronRight size={19} />
              </button>
            )}
          </>
        )}
        {settingsOpen && (
          <GraphSettings
            settings={settings}
            onChange={setSettings}
            onClose={() => setSettingsOpen(false)}
          />
        )}
        {help && (
          <section className={styles.help} role="dialog" aria-label="Calculator help">
            <button onClick={() => setHelp(false)}>Close</button>
            <strong>Quick guide</strong>
            <p>
              Try y=x², x²+y²=25, a=2, y=a*x, or (2,3). Type ^ for powers, sqrt( ) for roots, and ~
              for regression.
            </p>
            <p>
              Add a table, enter paired data, then choose a regression. Drag points or use sliders
              to explore. Click a curve near an intercept, turning point, or crossing to see
              coordinates.
            </p>
            <p>
              Enter adds a row. Ctrl/Cmd Z undoes; Ctrl/Cmd Shift Z redoes. Tab moves between
              controls. On the graph, arrows pan, +/− zoom, and Home resets. Ctrl/Alt K toggles the
              keypad.
            </p>
            <p>
              Lists: [1,2,3]. Domains: y=x²&#123;x&gt;0&#125;. Piecewise: y=&#123;x&lt;0:-x,x&#125;.
              Polar: r=2sin(theta). Parametric: (cos(t),sin(t)), 0≤t≤1.
            </p>
            <p>
              Computed roots are limited to the visible range. Numerical graphs and fits are
              approximations.
            </p>
          </section>
        )}
      </div>
      {(keypad || mode === "scientific") && (
        <CalculatorKeypad
          insert={insert}
          command={command}
          degrees={settings.degrees}
          onAngle={() => setSettings((s) => ({ ...s, degrees: !s.degrees }))}
        />
      )}
      {mode === "scientific" && (
        <button className={styles.scientificSettings} onClick={() => setSettingsOpen((v) => !v)}>
          Settings · {settings.degrees ? "Degrees" : "Radians"}
          {settings.complex ? " · Complex" : ""}
        </button>
      )}
    </div>
  );
}
