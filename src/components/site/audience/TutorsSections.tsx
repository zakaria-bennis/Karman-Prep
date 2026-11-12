// The For tutors page (founder, 2026-11-11: every page in the home page's world). It sells the Tutor
// affiliate plan to independent tutors. Three screens on a desktop, in the SAT Program page's language:
// 1, the offer and a sum of what it costs per student (TutorMath); 2, what the tutor gets beside a turning
// deck of the tutor's dashboard (TurnDeck, with made-up sample data, labelled as such); 3, what the students
// get beside the close. Every price comes from offer.ts; words from site-copy.ts sections 111 to 114 and
// 142 to 144.
import type { CSSProperties } from "react";
import { Arrow, Btn } from "@/components/site/parts";
import { CONTACT, PRACTICE_PLAN as PP, TUTOR_AFFILIATE_PLAN as TA } from "@/lib/marketing/offer";
import { list, pairs, section, SITE } from "@/lib/marketing/site-copy";
import { Moves, Ring, TickCard, triples } from "./bits";
import TurnDeck from "./TurnDeck";
import TutorMath from "./TutorMath";

/** Seats used on the sample dashboard. */
const SAMPLE_SEATS = 23;
/** How full each sample skill's bar is, beside its level word. */
const FILL = [1, 0.82, 0.64, 0.48, 0.86];

function tutorCards() {
  const d = section(143);
  const seats = Math.min(SAMPLE_SEATS, TA.maxStudents);
  return [
    <div key="cd" className="au-code">
      <p className="au-code-big" aria-label={d.code.split("").join(" ")}>
        {[...d.code].map((ch, i) => (
          <span key={i} data-sep={ch === "-" || undefined}>
            {ch}
          </span>
        ))}
      </p>
      <p>{d["code help"]}</p>
      <div className="au-seatbar" style={{ "--v": seats / TA.maxStudents } as CSSProperties}>
        <i />
      </div>
      <p className="au-seatline">
        <span>
          <b className="num">
            {seats}/{TA.maxStudents}
          </b>{" "}
          {d.seats}
        </span>
        <span>
          <b className="num">{TA.maxStudents - seats}</b> {d.left}
        </span>
      </p>
    </div>,
    <ul key="st" className="au-rows au-tight">
      {triples(d.roster).map(([name, pct, when]) => (
        <li key={name}>
          <Ring pct={Number(pct)} />
          <b>{name}</b>
          <em>{when}</em>
        </li>
      ))}
    </ul>,
    <ul key="as" className="au-rows">
      {pairs(d.assign).map(([task, to]) => (
        <li key={task}>
          <p>
            <b>{task}</b>
            <span>{d["assign title"]}</span>
          </p>
          <em className="au-chip">{to}</em>
        </li>
      ))}
    </ul>,
    <div key="sk" className="au-roster">
      <h4>{d["skills student"]}</h4>
      <ul className="pd-skills">
        {pairs(d.skills).map(([skill, level], i) => (
          <li key={skill} style={{ "--v": FILL[i] ?? 0.5, "--i": i } as CSSProperties}>
            <b>{skill}</b>
            <span>
              <i />
            </span>
            <em>{level}</em>
          </li>
        ))}
      </ul>
    </div>,
  ];
}

export default function TutorsSections({ start }: { start: string }) {
  const open = section(111);
  const theirs = section(112);
  const yours = section(113);
  const close = section(114);
  const sum = section(142);
  const dash = section(143);
  const teach = section(144);
  return (
    <>
      {/* 1. The offer, and what it costs per student */}
      <section className="pg-hero au-hero" id="top">
        <div className="mist" aria-hidden="true" />
        <div className="pg-in pg-two">
          <div className="pg-say">
            <h1>{open.headline}</h1>
            <p className="lede">{open.text}</p>
            <div className="pg-close">
              <div className="go-row">
                <Btn label={open.button} href={start} />
                <a className="more" href="#dash">
                  {open["second button"]}
                  <Arrow />
                </a>
              </div>
              <p className="fine">{open["button note"]}</p>
            </div>
          </div>
          <TutorMath
            monthly={TA.monthly}
            practiceMonthly={PP.monthly}
            max={TA.maxStudents}
            start={Math.min(20, TA.maxStudents)}
            w={{
              ask: sum.ask,
              unit: sum.unit,
              per: sum.per,
              alone: sum.alone,
              aloneUnit: sum["alone unit"],
              note: sum.note,
            }}
          />
        </div>
      </section>

      {/* 2. What the tutor gets, beside the dashboard */}
      <section className="sect pg-sect" id="dash" aria-labelledby="dash-h">
        <div className="mist" aria-hidden="true" />
        <div className="pg-in pg-two rv">
          <div className="pg-say">
            <h2 id="dash-h">{yours.headline}</h2>
            <Moves rows={pairs(yours.rows)} />
          </div>
          <div className="pg-say">
            <h3 className="pg-h3">{dash.headline}</h3>
            <TurnDeck
              titles={list(dash.titles)}
              captions={list(dash.captions)}
              brand={SITE.logo}
              who={dash.tutor}
              initials={dash.initials}
              sample={dash.sample}
              cards={tutorCards()}
            />
          </div>
        </div>
      </section>

      {/* 3. What the students get, beside the place to start */}
      <section className="sect pg-sect pg-end" id="start" aria-labelledby="start-h">
        <div className="mist" aria-hidden="true" />
        <div className="pg-in pg-two rv">
          <div className="pg-say">
            <h2 id="start-h">{theirs.headline}</h2>
            <TickCard rows={pairs(theirs.rows)} />
          </div>
          <div className="pg-say">
            <div className="pg-start au-start">
              <h3 className="pg-h3">{close.headline}</h3>
              <p className="lede">{close.text}</p>
              <div className="go-row">
                <Btn label={close.button} href={start} />
              </div>
              <p className="pg-small">{open["button note"]}</p>
            </div>
            <p className="au-teach">
              {teach.text}{" "}
              <a className="more" href={`mailto:${CONTACT.general}`}>
                {teach.link}
                <Arrow />
              </a>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
