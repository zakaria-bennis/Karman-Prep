"use client";

// The sitewide switch: while on, no generated question reaches any student.
import { useState, useTransition } from "react";
import { setHideGenerated } from "./actions";

export default function HideSwitch({ hidden }: { hidden: boolean }) {
  const [on, setOn] = useState(hidden);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="wb-section" style={{ display: "grid", gap: 8 }}>
      <label style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 44 }}>
        <input
          type="checkbox"
          role="switch"
          checked={on}
          disabled={pending}
          style={{ width: 22, height: 22 }}
          onChange={(event) => {
            const next = event.target.checked;
            setOn(next);
            setError(null);
            start(async () => {
              const result = await setHideGenerated({ hidden: next });
              if (!result.ok) {
                setOn(!next);
                setError(result.error);
              }
            });
          }}
        />
        <span>
          <b>Hide every generated question</b>
          <br />
          <small>
            {on
              ? "On: students see only original questions."
              : "Off: generated questions are in practice."}
          </small>
        </span>
      </label>
      {error && (
        <p role="alert" className="wb-alert">
          {error}
        </p>
      )}
    </div>
  );
}
