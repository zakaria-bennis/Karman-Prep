"use client";

// The Daily 10 on the student's phone, and it works: pick a choice, press Check, and the phone answers the way
// the app does, right or wrong, with the explanation. The question is our own, in the SAT's Standard English
// conventions style. Its words are the product's interface text, so they live here.
import { useState } from "react";
import { I, status } from "../live/screens";
import { Drawn, Phone } from "../parts";

const CHOICES = [
  ["A", "March, and"],
  ["B", "March"],
  ["C", "March; and"],
  ["D", "March and"],
] as const;
const RIGHT = 0;
const WHY = [
  "Both halves are full sentences, so joining them with “and” takes a comma before it.",
  "Without punctuation, two full sentences run together.",
  "A semicolon already joins the two sentences, so “and” can't follow it here.",
  "Joining two full sentences with “and” needs a comma before it.",
];

export default function DailyTenDemo() {
  const [pick, setPick] = useState(-1);
  const [checked, setChecked] = useState(false);
  const right = checked && pick === RIGHT;
  return (
    <Phone>
      <div className={`scr ph d10 live ${checked ? "done" : ""}`}>
        <Drawn html={status} />
        <div className="sh">
          <Drawn html={I.x} className="x" aria-hidden />
          <b>Your Daily 10</b>
          <span className="of">4 of 10</span>
        </div>
        <div className="steps" aria-hidden="true">
          {Array.from({ length: 10 }, (_, i) => (
            <i
              key={i}
              className={
                i < 3 ? "done" : i === 3 ? (checked ? (right ? "done" : "miss") : "now") : ""
              }
            />
          ))}
        </div>
        <p className="back">
          <i />
          Last time: missed
        </p>
        <p className="stem">
          The museum&apos;s new wing opened in <u /> its first exhibit drew more visitors in one
          week than the old galleries had in a month.
        </p>
        <p className="ask">
          Which choice completes the text so that it conforms to the conventions of Standard
          English?
        </p>
        <div className="ch" role="radiogroup" aria-label="Answer choices">
          {CHOICES.map(([l, t], k) => {
            const state = checked
              ? k === RIGHT
                ? "ok"
                : k === pick
                  ? "no"
                  : ""
              : pick === k
                ? "pick"
                : "";
            return (
              <button
                type="button"
                role="radio"
                aria-checked={pick === k}
                key={l}
                className={state}
                disabled={checked}
                onClick={() => setPick(k)}
              >
                <i>{l}</i>
                {t}
              </button>
            );
          })}
        </div>
        {checked ? (
          <div className={`fb ${right ? "ok" : "no"}`} aria-live="polite">
            <b>{right ? "Correct." : `Not quite. The answer is A.`}</b>
            <span>{WHY[right ? RIGHT : pick]}</span>
          </div>
        ) : null}
        <button
          type="button"
          className="go"
          disabled={pick < 0}
          onClick={() => {
            if (checked) {
              setChecked(false);
              setPick(-1);
            } else setChecked(true);
          }}
        >
          {checked ? "Try it again" : "Check"}
        </button>
      </div>
    </Phone>
  );
}
