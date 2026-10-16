"use client";
import { useState } from "react";
import { Delete, ArrowLeft, ArrowRight, CornerDownLeft } from "lucide-react";
import styles from "./engine.module.css";
export function CalculatorKeypad({
  insert,
  command,
  degrees,
  onAngle,
}: {
  insert: (text: string) => void;
  command: (key: string) => void;
  degrees: boolean;
  onAngle: () => void;
}) {
  const [functions, setFunctions] = useState(false);
  const functionsKeys = [
    "sin(",
    "cos(",
    "tan(",
    "asin(",
    "acos(",
    "atan(",
    "ln(",
    "log(",
    "exp(",
    "abs(",
    "mean(",
    "median(",
    "stdev(",
    "total(",
    "min(",
    "max(",
    "nCr(",
    "nPr(",
    "!",
    "i",
    "[",
    "]",
    "<=",
    ">=",
  ];
  const utilityKeys = ["x", "y", "^2", "^", "(", ")", "sqrt(", "pi", "|", "~", ",", "t"];
  const numberKeys = [
    "7",
    "8",
    "9",
    "/",
    "4",
    "5",
    "6",
    "*",
    "1",
    "2",
    "3",
    "-",
    "0",
    ".",
    "=",
    "+",
  ];
  const renderKey = (key: string) => (
    <button key={key} onPointerDown={(e) => e.preventDefault()} onClick={() => insert(key)}>
      {(
        {
          "sqrt(": "√",
          pi: "π",
          "^2": "a²",
          "^": "aᵇ",
          "*": "×",
          "/": "÷",
          "<=": "≤",
          ">=": "≥",
        } as Record<string, string>
      )[key] ?? (key.length > 1 ? key.replace("(", "") : key)}
    </button>
  );
  return (
    <section className={styles.keypad} aria-label="Calculator keypad">
      <div className={styles.keypadTabs}>
        <button aria-pressed={functions} onClick={() => setFunctions((v) => !v)}>
          {functions ? "Numbers" : "Functions"}
        </button>
        <button onClick={onAngle}>{degrees ? "DEG" : "RAD"}</button>
        <span />
        <button aria-label="Move cursor left" onClick={() => command("ArrowLeft")}>
          <ArrowLeft size={17} />
        </button>
        <button aria-label="Move cursor right" onClick={() => command("ArrowRight")}>
          <ArrowRight size={17} />
        </button>
        <button aria-label="Backspace" onClick={() => command("Backspace")}>
          <Delete size={18} />
        </button>
        <button aria-label="New expression" onClick={() => command("Enter")}>
          <CornerDownLeft size={18} />
        </button>
      </div>
      {functions ? (
        <div className={styles.keys}>{functionsKeys.map(renderKey)}</div>
      ) : (
        <div className={styles.keyBlocks}>
          <div className={styles.utilityKeys}>{utilityKeys.map(renderKey)}</div>
          <div className={styles.numberKeys}>{numberKeys.map(renderKey)}</div>
        </div>
      )}
    </section>
  );
}
