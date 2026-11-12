// The Schools page (founder, 2026-11-11: every page in the home page's world), for school leaders. Three
// screens on a desktop, in the SAT Program page's language: 1, the offer and a sum of what it costs for your
// number of students (SeatSum); 2, what each student gets beside a turning deck of the school view
// (TurnDeck, drawn with made-up sample data, labelled as such); 3, how it starts beside the book-a-call card
// (SchoolCallForm, founder 2026-11-12: it replaced the school-license email). Every main button leads to
// that card. Words: site-copy.ts sections 101 to 104, 140 and 141.
import { Arrow, Btn } from "@/components/site/parts";
import { PARTNER_TOTAL } from "@/data/partners/partner-regions";
import { SCHOOL_PLAN as SCHOOL } from "@/lib/marketing/offer";
import { list, pairs, section, SITE } from "@/lib/marketing/site-copy";
import { Moves, Ring, TickCard, triples } from "./bits";
import PartnerMap from "./PartnerMap";
import SchoolCallForm from "./SchoolCallForm";
import SeatSum from "./SeatSum";
import TurnDeck from "./TurnDeck";

/** Skill squares for a sample student: four levels, spread so no two rows look alike. */
function Squares({ pct, seed }: { pct: number; seed: number }) {
  return (
    <span className="au-squares" aria-hidden="true">
      {Array.from({ length: 8 }, (_, i) => (
        <i
          key={i}
          data-l={Math.min(3, Math.floor(((pct + i * 29 + seed * 13) % 100) / 25))}
          style={{ "--j": i } as React.CSSProperties}
        />
      ))}
    </span>
  );
}

function schoolCards() {
  const v = section(141);
  const classes = triples(v.classes);
  const total = classes.reduce((sum, c) => sum + Number(c[2] ?? 0), 0);
  const first = classes[0] ?? ["", "", "0"];
  const size = Number(first[2]);
  return [
    <ul key="cl" className="au-rows">
      {classes.map(([name, code, count]) => (
        <li key={name}>
          <p>
            <b>{name}</b>
            <span>
              {v["code label"]} <code>{code}</code>
            </span>
          </p>
          <em>
            <b className="num">{count}</b> {v.students}
          </em>
        </li>
      ))}
    </ul>,
    <div key="jc" className="au-code">
      <p className="au-code-big" aria-label={first[1].split("").join(" ")}>
        {[...first[1]].map((ch, i) => (
          <span key={i} data-sep={ch === "-" || undefined}>
            {ch}
          </span>
        ))}
      </p>
      <p>{v["code help"]}</p>
      <p className="au-pills">
        <span>{v["copy code"]}</span>
        <span>{v["copy link"]}</span>
      </p>
    </div>,
    <div key="ro" className="au-roster">
      <h4>{v["roster title"]}</h4>
      <ul className="au-rows au-tight">
        {pairs(v.roster).map(([name, pct], i) => (
          <li key={name}>
            <Ring pct={Number(pct)} />
            <b>{name}</b>
            <Squares pct={Number(pct)} seed={i} />
          </li>
        ))}
      </ul>
    </div>,
    <ul key="hw" className="au-rows">
      {triples(v.homework).map(([task, due, done]) => (
        <li key={task}>
          <p>
            <b>{task}</b>
            <span>{due}</span>
          </p>
          <em className="au-done" style={{ "--v": Number(done) / size } as React.CSSProperties}>
            <span className="num">
              {done}/{size}
            </span>{" "}
            {v.done}
            <i />
          </em>
        </li>
      ))}
    </ul>,
    <div key="pl" className="au-plan">
      <p className="au-plan-h">{v["plan title"]}</p>
      <p>{v["plan text"]}</p>
      <p className="au-plan-row">
        <span>{v.seats}</span>
        <b className="num">{total}</b>
      </p>
    </div>,
  ];
}

/** Where every main button goes: the book-a-call card at the foot of the page. */
const CALL = "#call";

/** Beside the form, the reasons to trust it: real partners, the free year, and a quick reply. */
const PROOF = [
  `${PARTNER_TOTAL} districts already use Karman`,
  ...(SCHOOL.firstYearFree ? ["The first year is free"] : []),
  "We reply within one school day",
];

export default function SchoolsSections({
  partners = false,
}: {
  /** The partner map, off unless PARTNER_MAP=on (it waits on the founder's OK). */
  partners?: boolean;
}) {
  const open = section(101);
  const gets = section(102);
  const how = section(103);
  const close = section(104);
  const sum = section(140);
  const view = section(141);
  return (
    <>
      {/* 1. The offer, and what it costs for your number of students */}
      <section className="pg-hero au-hero" id="top">
        <div className="mist" aria-hidden="true" />
        <div className="pg-in pg-two">
          <div className="pg-say">
            <h1>{open.headline}</h1>
            <p className="lede">{open.text}</p>
            <div className="pg-close">
              <div className="go-row">
                <Btn label={open.button} href={CALL} />
                <a className="more" href="#view">
                  {open["second button"]}
                  <Arrow />
                </a>
              </div>
              <p className="fine">{open["button note"]}</p>
            </div>
          </div>
          <SeatSum
            perStudent={SCHOOL.pricePerStudentPerYear}
            min={25}
            max={2000}
            step={25}
            start={250}
            w={{
              ask: sum.ask,
              unit: sum.unit,
              first: sum.first,
              after: sum.after,
              afterNote: sum["after note"],
              family: sum.family,
            }}
          />
        </div>
      </section>

      {partners && <PartnerMap />}

      {/* 2. What each student gets, beside the school view */}
      <section className="sect pg-sect" id="view" aria-labelledby="view-h">
        <div className="mist" aria-hidden="true" />
        <div className="pg-in pg-two rv">
          <div className="pg-say">
            <h2 id="view-h">{gets.headline}</h2>
            <TickCard rows={pairs(gets.rows)} />
          </div>
          <div className="pg-say">
            <h3 className="pg-h3">{view.headline}</h3>
            <TurnDeck
              titles={list(view.titles)}
              captions={list(view.captions)}
              brand={SITE.logo}
              who={view.school}
              initials={view.initials}
              sample={view.sample}
              cards={schoolCards()}
            />
          </div>
        </div>
      </section>

      {/* 3. How it starts, beside the book-a-call card */}
      <section className="sect pg-sect pg-end" id="start" aria-labelledby="start-h">
        <div className="mist" aria-hidden="true" />
        <div className="pg-in pg-two rv">
          <div className="pg-say">
            <h2 id="start-h">{how.headline}</h2>
            <Moves rows={pairs(how.rows)} />
          </div>
          <SchoolCallForm heading={close.headline} text={close.text} proof={PROOF} />
        </div>
      </section>
    </>
  );
}
