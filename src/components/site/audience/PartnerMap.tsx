// The partner map on /schools (founder, 2026-11-12): 65 partner districts as dots around the areas
// they're in, clustered near each area's center with a few scattered further out. Hovering or
// focusing a dot shows its area ("Boston area"), or the district's name for the few that agreed
// in writing to be named (see src/data/partners/partner-regions.ts). Drawn on the server: the US
// outline traces in, then the dots land area by area, west to east, and the count beside it
// rises. Reduced motion shows it all at once. Off unless PARTNER_MAP=on.
import { geoAlbersUsa } from "d3";
import { PARTNER_REGIONS, PARTNER_TOTAL, partnerDots } from "@/data/partners/partner-regions";
import {
  US_BORDERS,
  US_NATION,
  US_SCALE,
  US_TRANSLATE,
  US_VIEWBOX,
} from "@/data/partners/us-outline";

const STATES = new Set(PARTNER_REGIONS.map((r) => r.state)).size;

export default function PartnerMap() {
  const project = geoAlbersUsa().scale(US_SCALE).translate(US_TRANSLATE);
  // Areas land west to east, so the map fills the way the eye reads it.
  const order = [...PARTNER_REGIONS].sort((a, b) => a.lon - b.lon).map((r) => r.label);
  const dots = partnerDots()
    .map((d) => {
      const p = project([d.lon, d.lat]);
      const area = PARTNER_REGIONS.find((r) => r.label === d.label || r.named?.includes(d.label));
      return p ? { ...d, x: p[0], y: p[1], wave: order.indexOf(area?.label ?? d.label) } : null;
    })
    .filter((d): d is NonNullable<typeof d> => d !== null);
  const areas = [...PARTNER_REGIONS].sort((a, b) => b.count - a.count);

  return (
    <section className="sect pg-sect" id="partners" aria-labelledby="partners-h">
      <div className="mist" aria-hidden="true" />
      <div className="pg-in rv pm">
        <div className="pg-say pm-say">
          <h2 id="partners-h">
            <span className="num">{PARTNER_TOTAL}</span> districts already use Karman
          </h2>
          <p className="lede">
            Across {STATES} states, from the Bay Area to Boston. Every student in them has a plan of
            their own, and every school sees its classes the same way yours would.
          </p>
        </div>
        <figure className="au-report pm-card">
          <svg className="pm-map" viewBox={US_VIEWBOX} role="img" aria-labelledby="pm-title">
            <title id="pm-title">
              A map of the United States with {PARTNER_TOTAL} partner districts marked
            </title>
            <path className="pm-land" d={US_NATION} pathLength={1} />
            <path className="pm-borders" d={US_BORDERS} />
            {dots.map((d, i) => (
              <g
                key={i}
                className="pm-dot"
                data-hub={d.index === 0 ? "" : undefined}
                data-named={d.named ? "" : undefined}
                tabIndex={0}
                style={{ "--w": d.wave, "--j": d.index } as React.CSSProperties}
                transform={`translate(${d.x.toFixed(1)} ${d.y.toFixed(1)})`}
              >
                <title>{d.label}</title>
                {d.index === 0 && <circle className="pm-pulse" r={9} />}
                <circle className="pm-core" r={d.index === 0 ? 6 : 4.5} />
                <g className="pm-tip" aria-hidden="true">
                  <rect
                    x={-d.label.length * 4.2 - 12}
                    y={-42}
                    width={d.label.length * 8.4 + 24}
                    height={28}
                    rx={14}
                  />
                  <text y={-23} textAnchor="middle">
                    {d.label}
                  </text>
                </g>
              </g>
            ))}
          </svg>
          <figcaption className="pm-areas">
            <ul>
              {areas.map((r) => (
                <li
                  key={r.label}
                  style={{ "--v": r.count / areas[0].count } as React.CSSProperties}
                >
                  <span>{r.label}</span>
                  <b className="num">{r.count}</b>
                  <i aria-hidden="true" />
                </li>
              ))}
            </ul>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
