import ArtDrawing from "@/components/site/ArtDrawing";
import LeadFormCard from "@/components/site/LeadFormCard";
import Photo from "@/components/site/Photo";
import SitePage from "@/components/site/SitePage";
import { Close, InnerHero, Rows } from "@/components/site/inner";
import { pageMeta } from "@/components/site/meta";
import { delay } from "@/components/site/parts";
import { ROUTES } from "@/components/site/routes";
import {
  formatPrice,
  PRIVATE_HOURLY_RATE,
  PRIVATE_PACKAGES,
  TRACK_RECORD,
} from "@/lib/marketing/offer";
import { list, section } from "@/lib/marketing/site-copy";

export const metadata = pageMeta(
  ROUTES.private,
  "Karman Prep: Private tutoring",
  `One-on-one SAT tutoring planned back from your student's test date: weekly 60-minute sessions that go through every mistake. ${formatPrice(PRIVATE_HOURLY_RATE)} an hour, in packages of ${PRIVATE_PACKAGES.map((p) => p.hours).join(" or ")}.`
);

/** "Private 20 = 20 hours, $2,900. Comes with ..." -> name, price, hours and the rest */
function Pack({ s, hot = false }: { s: string; hot?: boolean }) {
  const [name, rest = ""] = s.split(" = ");
  const [hours = "", price = "", ...more] = rest.split(", ");
  const [amount, ...after] = price.split(".");
  return (
    <article className={`i-pack rv ${hot ? "hot" : ""}`}>
      <h3>{name}</h3>
      <p className="i-price">
        <b>{amount}</b>
        <span>{hours}</span>
      </p>
      <p>{`${after.join(".")} ${more.join(", ")}`.trim()}</p>
    </article>
  );
}

export default function PrivatePage() {
  const packs = section(33);
  const rec = section(34);
  return (
    <SitePage kind="inner" dock={[section(31).button, "#call"]}>
      <InnerHero
        n={31}
        href="#call"
        side={
          <>
            <ArtDrawing name="call" style={delay(0.2)} />
            <Photo name="private" className="ph-hero" />
          </>
        }
      />
      <Rows n={32} style="steps" />
      <section className="i-sec" data-light id="s-33">
        <div className="in">
          <div className="i-head">
            <h2 className="rv">{packs.headline}</h2>
          </div>
          <div className="i-packs">
            <Pack s={packs["small package"]} />
            <Pack s={packs["large package"]} hot />
          </div>
          <ul className="i-list check inline">
            {list(packs.includes).map((x) => (
              <li className="rv" key={x}>
                <i className="mk" />
                <span>{x}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section className="i-sec i-record" data-light id="s-34">
        <div className="in i-split">
          <p className="i-big rv">+{TRACK_RECORD.averageGain}</p>
          <div className="i-head">
            <h2 className="rv">{rec.headline}</h2>
            <p className="lede rv">{rec.text}</p>
            <p className="i-proof rv">{rec.proof}</p>
          </div>
        </div>
      </section>
      <Rows n={35} />
      <Close n={36}>
        <LeadFormCard n={36} form="call" anchor="call" />
      </Close>
    </SitePage>
  );
}
