// TEMPORARY (2026-11-12): the Private tutoring page's opening in five designs (PrivateLab.tsx).
//   1 Headline beside three hard facts
//   2 Headline over the starting-score switch
//   3 Headline beside the promise for every starting score, as a table
//   4 Two columns: for your student, for you
//   5 One huge line and the button, nothing else
// Words: site-copy.ts section 31; numbers: offer.ts.
import { Arrow, Btn } from "@/components/site/parts";
import ProgramPromise from "@/components/site/program/ProgramPromise";
import { GUARANTEE as G } from "@/lib/marketing/offer";
import { list, pairs, section } from "@/lib/marketing/site-copy";

const bandLabels = () => [
  ...G.bands.map((b, i) =>
    i === 0 ? `Up to ${b.upTo}` : `${G.bands[i - 1].upTo + 10} to ${b.upTo}`
  ),
  `${G.noGuaranteeFrom} and up`,
];

function Actions() {
  const s = section(31);
  return (
    <div className="pg-close">
      <div className="go-row">
        <Btn label={s.button} href="#call" />
        <a className="more" href="#packages">
          {s["second button"]}
          <Arrow />
        </a>
      </div>
      <p className="fine">{s.note}</p>
    </div>
  );
}

function Shell({
  k,
  two = true,
  children,
}: {
  k: number;
  two?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={`pg-hero ph ph-${k}`} id="top">
      <div className="mist" aria-hidden="true" />
      <div className={`pg-in ${two ? "pg-two" : ""}`}>{children}</div>
    </section>
  );
}

export function heroDesigns() {
  const s = section(31);
  const say = (
    <div className="pg-say">
      <h1>{s.headline}</h1>
      <Actions />
    </div>
  );
  return [
    <Shell key={1} k={1}>
      {say}
      <ol className="ph-facts">
        {pairs(s.facts).map(([k, v], i) => (
          <li key={k} style={{ "--i": i } as React.CSSProperties}>
            <b>{k}</b>
            <span>{v}</span>
          </li>
        ))}
      </ol>
    </Shell>,
    <Shell key={2} k={2} two={false}>
      <h1>{s.headline}</h1>
      <ProgramPromise
        ask={s.ask}
        bands={bandLabels()}
        gains={G.bands.map((b) => b.private)}
        promise={s.promise}
        highTitle={s["high title"]}
        high={s.high}
      />
      <Actions />
    </Shell>,
    <Shell key={3} k={3}>
      {say}
      <div className="ph-bands">
        <p>{s["bands title"]}</p>
        <ol>
          {G.bands.map((b, i) => (
            <li
              key={b.upTo}
              style={{ "--i": i, "--v": b.private / G.bands[0].private } as React.CSSProperties}
            >
              <span>{bandLabels()[i]}</span>
              <i />
              <b className="num">+{b.private}</b>
            </li>
          ))}
        </ol>
        <small>{s.high}</small>
      </div>
    </Shell>,
    <Shell key={4} k={4} two={false}>
      <h1>{s.headline}</h1>
      <div className="ph-split">
        {(
          [
            [s["student title"], s.student],
            [s["parent title"], s.parent],
          ] as const
        ).map(([title, items]) => (
          <article key={title}>
            <h3>{title}</h3>
            <ul>
              {list(items).map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
      <Actions />
    </Shell>,
    <Shell key={5} k={5} two={false}>
      <h1>{s["kicker headline"]}</h1>
      <Actions />
    </Shell>,
  ];
}
