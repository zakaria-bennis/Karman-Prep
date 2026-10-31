// The Daily 10 on the student's phone, and it works: pick a choice, press Check, and the phone answers the way
// the app does, right or wrong, with the explanation (live/daily.ts). The question is our own, in the SAT's
// Standard English conventions style. Its words are the product's interface text, so they live here; the
// feedback lines ride on the elements as data attributes for the behaviour to read.
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
  return (
    <Phone>
      <div
        className="scr ph d10 live"
        data-ok="Correct."
        data-no={`Not quite. The answer is ${CHOICES[RIGHT][0]}.`}
        data-check="Check"
        data-again="Try it again"
      >
        <Drawn html={status} />
        <div className="sh">
          <Drawn html={I.x} className="x" aria-hidden />
          <b>Your Daily 10</b>
          <span className="of">4 of 10</span>
        </div>
        <div className="steps" aria-hidden="true">
          {Array.from({ length: 10 }, (_, i) => (
            <i key={i} className={i < 3 ? "done" : i === 3 ? "now" : ""} />
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
          {CHOICES.map(([l, t], k) => (
            <button
              type="button"
              role="radio"
              aria-checked={false}
              key={l}
              data-why={WHY[k]}
              data-right={k === RIGHT ? "1" : undefined}
            >
              <i>{l}</i>
              {t}
            </button>
          ))}
        </div>
        <button type="button" className="go" disabled>
          Check
        </button>
      </div>
    </Phone>
  );
}
