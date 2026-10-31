"use client";

import { cn } from "@/lib/utils";
import { Label, YesNoChoice } from "./shared";

const HS_YEARS = ["freshman", "sophomore", "junior", "senior"] as const;

export function BackgroundStep(props: {
  hsYear: string;
  setHsYear: (v: string) => void;
  satTaken: "yes" | "no" | "";
  setSatTaken: (v: "yes" | "no" | "") => void;
  recentSatMath: number;
  setRecentSatMath: (n: number) => void;
  recentSatReading: number;
  setRecentSatReading: (n: number) => void;
  recentSatTimePressure: "yes" | "no" | "";
  setRecentSatTimePressure: (v: "yes" | "no" | "") => void;
  psatTaken: "yes" | "no" | "";
  setPsatTaken: (v: "yes" | "no" | "") => void;
  psatScore: number;
  setPsatScore: (n: number) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <Label>What year are you in high school?</Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {HS_YEARS.map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => props.setHsYear(y)}
              className={cn(
                "rounded-lg border px-3 py-2 text-xs font-semibold capitalize transition-colors",
                props.hsYear === y
                  ? "border-info/40 bg-info text-ivory"
                  : "border-ivory/10 bg-surface/[0.03] text-ivory hover:border-ivory/30"
              )}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label>Have you taken the SAT yet?</Label>
        <YesNoChoice value={props.satTaken} onChange={props.setSatTaken} />
      </div>

      {props.satTaken === "yes" && (
        <>
          <div>
            <Label>Most recent Math score</Label>
            <div className="mb-1 text-center text-2xl font-extrabold text-ivory">
              {props.recentSatMath}
            </div>
            <input
              type="range"
              min={200}
              max={800}
              step={5}
              value={props.recentSatMath}
              onChange={(e) => props.setRecentSatMath(Number(e.target.value))}
              className="w-full accent-info"
            />
            <div className="mt-1 flex justify-between text-[11px] text-taupe">
              <span>200</span>
              <span>800</span>
            </div>
          </div>
          <div>
            <Label>Most recent Reading & Writing score</Label>
            <div className="mb-1 text-center text-2xl font-extrabold text-ivory">
              {props.recentSatReading}
            </div>
            <input
              type="range"
              min={200}
              max={800}
              step={5}
              value={props.recentSatReading}
              onChange={(e) => props.setRecentSatReading(Number(e.target.value))}
              className="w-full accent-info"
            />
            <div className="mt-1 flex justify-between text-[11px] text-taupe">
              <span>200</span>
              <span>800</span>
            </div>
          </div>
          <div>
            <Label>Was time a pressuring factor on that test?</Label>
            <YesNoChoice
              value={props.recentSatTimePressure}
              onChange={props.setRecentSatTimePressure}
            />
          </div>
        </>
      )}

      <div>
        <Label>Have you taken the PSAT?</Label>
        <YesNoChoice value={props.psatTaken} onChange={props.setPsatTaken} />
      </div>
      {props.psatTaken === "yes" && (
        <div>
          <Label>PSAT total score</Label>
          <div className="mb-1 text-center text-2xl font-extrabold text-ivory">
            {props.psatScore}
          </div>
          <input
            type="range"
            min={320}
            max={1520}
            step={10}
            value={props.psatScore}
            onChange={(e) => props.setPsatScore(Number(e.target.value))}
            className="w-full accent-info"
          />
          <div className="mt-1 flex justify-between text-[11px] text-taupe">
            <span>320</span>
            <span>1520</span>
          </div>
        </div>
      )}
    </div>
  );
}
