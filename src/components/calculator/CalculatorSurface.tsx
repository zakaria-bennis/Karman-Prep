"use client";
import { lazy, Suspense } from "react";
import type { CalculatorInstance, CalculatorMode } from "@/lib/calculator/types";
import styles from "./calculator.module.css";
const Engine = lazy(() => import("./CalculatorEngine"));
export function CalculatorSurface({
  mode,
  dark,
  keypad,
  visible,
  onReady,
}: {
  mode: CalculatorMode;
  dark: boolean;
  mobile: boolean;
  keypad: boolean;
  visible: boolean;
  onReady: (mode: CalculatorMode, instance: CalculatorInstance | null) => void;
}) {
  return (
    <div className={styles.surface} hidden={!visible}>
      <Suspense fallback={<div className={styles.loading}>Loading calculator…</div>}>
        <Engine mode={mode} dark={dark} keypad={keypad} visible={visible} onReady={onReady} />
      </Suspense>
    </div>
  );
}
