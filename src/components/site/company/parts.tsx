// Pieces the About, FAQ and Research pages share (company.css). The close is the SAT Program page's
// language in one centred band: a big serif line, one sentence, Start free and a quiet second link.
import { Arrow, Btn } from "@/components/site/parts";
import { ROUTES } from "@/components/site/routes";

export function Tick() {
  return (
    <svg className="pg-tick" viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="10" />
      <path d="M5.5 10.5l3 3 6-7" />
    </svg>
  );
}

/** The last band of a page: the headline, one sentence, and Start free (or `href`) as the main action. */
export function Close({
  id,
  headline,
  text,
  button,
  href = ROUTES.signUp,
  second,
}: {
  id: string;
  headline: string;
  text: string;
  button: string;
  /** Where the main button goes: Start free, unless the page's close asks for something else. */
  href?: string;
  second?: { label: string; href: string };
}) {
  return (
    <section className="sect pg-sect co-end" id={id} aria-labelledby={`${id}-h`}>
      <div className="mist" aria-hidden="true" />
      <div className="pg-in co-in co-centre rv">
        <h2 id={`${id}-h`}>{headline}</h2>
        <p className="lede">{text}</p>
        <div className="co-go">
          <Btn label={button} href={href} />
          {second ? (
            <a className="more" href={second.href}>
              {second.label}
              <Arrow />
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}
