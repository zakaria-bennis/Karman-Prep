// The Private tutoring page, in the home page's world. Four screens:
//   1 One line, arriving word by word, and the button
//   2 Booking: the student books their own sessions, beside a booking demo that plays once and can be used
//   3 The two packages, the same size: Private 10 in black, Private 20 in blue with its badges
//   4 The free-call form: a name, a number, an email and a time
// Words: site-copy.ts sections 31, 32, 33 and 36; numbers: facts.ts.
import { Arrow } from "@/components/site/parts";
import { ROUTES } from "@/components/site/routes";
import { list, pairs, section, SITE } from "@/lib/marketing/site-copy";
import HeroLab from "@/components/site/hero/HeroLab";
import { heroWords } from "@/components/site/hero/hero-words";
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
      <HeroLab
        page="private"
        headline={top.headline}
        primary={{ label: top.button, href: "#call" }}
        secondary={{ label: top["second button"], href: "#packages" }}
        w={heroWords("private")}
        demo={
          <SessionDemo today={today} w={{ ...slot, confirm: book.confirm, booked: book.booked }} />
        }
      />

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
          <SessionDemo today={today} w={{ ...slot, confirm: book.confirm, booked: book.booked }} />
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
              lead: packs["small lead"],
              bullets: list(packs["small bullets"]),
            }}
            large={{
              name: F.large.name,
              price: F.large.price,
              each: F.large.each,
              lead: packs["large lead"],
              bullets: list(packs["large bullets"]),
              badge: `${packs.save} ${F.saved}`,
            }}
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
