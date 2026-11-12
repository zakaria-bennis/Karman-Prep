// The Private tutoring page, in the home page's world. Four screens:
//   1 One large line and the button
//   2 Booking: what is flexible about it, beside a booking demo that plays once and can then be used
//   3 The two packages; Private 20 is the recommended one and starts pinned
//   4 The free-call form: a name, a number, an email and a time
// Words: site-copy.ts sections 31, 32, 33 and 36; numbers: facts.ts.
import { Arrow, Btn } from "@/components/site/parts";
import { ROUTES } from "@/components/site/routes";
import { list, pairs, section, SITE } from "@/lib/marketing/site-copy";
import CallForm from "./CallForm";
import { PRIVATE_FACTS as F } from "./facts";
import PlanPicker from "./PlanPicker";
import SessionDemo from "./SessionDemo";

export default function PrivateSections({ today }: { today: string }) {
  const top = section(31);
  const book = section(32);
  const packs = section(33);
  const close = section(36);
  const slot = {
    pickDay: book["pick day"],
    pickTime: book["pick time"],
    earlier: book.earlier,
    later: book.later,
    none: book.none,
  };
  return (
    <>
      <section className="pg-hero pv-hero" id="top">
        <div className="mist" aria-hidden="true" />
        <div className="pg-in">
          <h1>{top.headline}</h1>
          <div className="pg-close">
            <div className="go-row">
              <Btn label={top.button} href="#call" />
              <a className="more" href="#packages">
                {top["second button"]}
                <Arrow />
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="sect pg-sect pv-book" id="session" aria-labelledby="session-h">
        <div className="mist" aria-hidden="true" />
        <div className="pg-in pg-two rv">
          <div className="pg-say">
            <h2 id="session-h">{book.headline}</h2>
            <ul className="pv-points">
              {pairs(book.points).map(([k, v]) => (
                <li key={k}>
                  <b>{k}</b>
                  <span>{v}</span>
                </li>
              ))}
            </ul>
          </div>
          <SessionDemo
            today={today}
            w={{ ...slot, confirm: book.confirm, booked: book.booked, again: book.again }}
          />
        </div>
      </section>

      <section className="sect pg-sect pv-packs" id="packages" aria-labelledby="packages-h">
        <div className="mist" aria-hidden="true" />
        <div className="pg-in rv">
          <h2 id="packages-h">{packs.headline}</h2>
          <PlanPicker
            small={{
              name: F.small.name,
              price: F.small.price,
              each: F.small.each,
              bullets: list(packs["small bullets"]),
            }}
            large={{
              name: F.large.name,
              price: F.large.price,
              each: F.large.each,
              bullets: list(packs["large bullets"]),
            }}
            plus={packs.plus}
            best={packs.best}
            per={packs.per}
            call={packs.call}
          />
          <a className="more" href={ROUTES.guarantee}>
            {packs.link}
            <Arrow />
          </a>
        </div>
      </section>

      <section className="sect pg-sect pg-end pv-close" aria-labelledby="call-h">
        <div className="mist" aria-hidden="true" />
        <div className="pg-in rv">
          <h2 id="call-h">{close.headline}</h2>
          <CallForm
            today={today}
            w={{
              ...slot,
              name: close["form name"],
              phone: close["form phone"],
              email: close["form email"],
              zone: close["form zone"],
              button: close["form button"],
              sending: SITE["form sending"],
              doneTitle: close["form done title"],
              doneText: close["form done text"],
              errors: {
                name: SITE["form error your name"],
                phone: SITE["form error phone"],
                email: SITE["form error email"],
                slot: SITE["form error slot"],
                server: SITE["form error server"],
                network: SITE["form error network"],
              },
            }}
          />
        </div>
      </section>
    </>
  );
}
