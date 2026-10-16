"use client";
import { useState } from "react";
import { X } from "lucide-react";
import type { Settings } from "@/lib/calculator/types";
import styles from "./engine.module.css";
export function GraphSettings({
  settings,
  onChange,
  onClose,
}: {
  settings: Settings;
  onChange: (s: Settings) => void;
  onClose: () => void;
}) {
  const [bounds, setBounds] = useState({
    xmin: String(settings.xmin),
    xmax: String(settings.xmax),
    ymin: String(settings.ymin),
    ymax: String(settings.ymax),
  });
  const [error, setError] = useState("");
  return (
    <section
      className={styles.settings}
      role="dialog"
      aria-label="Graph settings"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <header>
        <strong>Graph settings</strong>
        <button autoFocus aria-label="Close graph settings" onClick={onClose}>
          <X size={17} />
        </button>
      </header>
      <fieldset>
        <legend>Angle measure</legend>
        {[true, false].map((degrees) => (
          <label key={String(degrees)}>
            <input
              type="radio"
              name="angle"
              checked={settings.degrees === degrees}
              onChange={() => onChange({ ...settings, degrees })}
            />
            {degrees ? "Degrees" : "Radians"}
          </label>
        ))}
      </fieldset>
      <label>
        <input
          type="checkbox"
          checked={settings.complex}
          onChange={(e) => onChange({ ...settings, complex: e.target.checked })}
        />
        Complex mode
      </label>
      <fieldset>
        <legend>Grid</legend>
        {(["square", "polar", "none"] as const).map((grid) => (
          <label key={grid}>
            <input
              type="radio"
              name="grid"
              checked={settings.grid === grid}
              onChange={() => onChange({ ...settings, grid })}
            />
            {grid === "polar" ? "Radial" : grid === "square" ? "Square" : "None"}
          </label>
        ))}
      </fieldset>
      <label>
        <input
          type="checkbox"
          checked={settings.axes}
          onChange={(e) => onChange({ ...settings, axes: e.target.checked })}
        />
        Axes
      </label>
      <label>
        <input
          type="checkbox"
          checked={settings.labels}
          onChange={(e) => onChange({ ...settings, labels: e.target.checked })}
        />
        Axis numbers
      </label>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const b = {
            xmin: Number(bounds.xmin),
            xmax: Number(bounds.xmax),
            ymin: Number(bounds.ymin),
            ymax: Number(bounds.ymax),
          };
          if (
            Object.values(b).some((v) => !Number.isFinite(v)) ||
            b.xmax - b.xmin < 1e-8 ||
            b.ymax - b.ymin < 1e-8 ||
            Math.max(b.xmax - b.xmin, b.ymax - b.ymin) > 1e12
          ) {
            setError("Enter increasing, finite bounds.");
            return;
          }
          onChange({ ...settings, ...b });
          setError("");
        }}
      >
        <div className={styles.bounds}>
          {(["xmin", "xmax", "ymin", "ymax"] as const).map((key) => (
            <label key={key}>
              {key.replace("min", " min").replace("max", " max")}
              <input
                aria-label={key}
                type="number"
                step="any"
                value={bounds[key]}
                onChange={(e) => setBounds({ ...bounds, [key]: e.target.value })}
              />
            </label>
          ))}
        </div>
        <button className={styles.apply} type="submit">
          Apply bounds
        </button>
        {error && <p role="alert">{error}</p>}
      </form>
    </section>
  );
}
