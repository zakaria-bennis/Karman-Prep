// The FAQ page, in the home page's world (founder, 2026-11-11: the questions float, and when you click one it
// "texts you", exactly like the home page's question clouds). 1: the heading and the clouds (Doubts.tsx, the
// home page's own component, fed from this page's questions). 2: every answer in one place, by topic, for the
// parent who would rather read than chase clouds, and for search engines and screen readers. 3: the close.
// Words: site-copy.ts, section 71. Styles: company.css.
import Doubts from "@/components/site/home/Doubts";
import { list, pairs, section } from "@/lib/marketing/site-copy";
import { Close } from "./parts";

/** The topics in section 71, each a label holding its own questions, in the order of its "groups" line. */
const TOPICS = ["money", "promise", "classes", "start"] as const;

/** Every question and answer on the page, topic by topic. The FAQPage JSON-LD is built from the same list. */
export function faqItems(): [string, string][] {
  const f = section(71);
  return TOPICS.flatMap((t) => pairs(f[t]));
}

export default function FaqSections() {
  const f = section(71);
  const names = list(f.groups);
  return (
    <>
      {/* 1. Ask us anything: the questions drift up the sky, and a picked one is texted and answered */}
      <section className="pg-hero fq-hero" id="top">
        <div className="mist" aria-hidden="true" />
        <div className="pg-in co-in fq-in">
          <div className="pg-say">
            <h1>{f.headline}</h1>
            <p className="lede">{f.text}</p>
          </div>
          <Doubts
            items={faqItems()}
            words={{
              label: f.label,
              box: f.box,
              typing: f.typing,
              delivered: f.delivered,
              read: f.read,
            }}
          />
        </div>
      </section>

      {/* 2. Every answer, by topic */}
      <section className="sect pg-sect co-tall" id="answers" aria-labelledby="answers-h">
        <div className="mist" aria-hidden="true" />
        <div className="pg-in co-in co-stack">
          <div className="pg-say rv">
            <h2 id="answers-h">{f["all headline"]}</h2>
            <p className="lede">{f["all text"]}</p>
          </div>
          <div className="fq-groups">
            {TOPICS.map((t, k) => (
              <article className="co-card fq-group rv" key={t}>
                <h3>{names[k]}</h3>
                {pairs(f[t]).map(([q, a]) => (
                  <details key={q}>
                    <summary>
                      {q}
                      <i aria-hidden="true" />
                    </summary>
                    <p>{a}</p>
                  </details>
                ))}
              </article>
            ))}
          </div>
        </div>
      </section>

      <Close id="start" headline={f["close headline"]} text={f["close text"]} button={f.button} />
    </>
  );
}
