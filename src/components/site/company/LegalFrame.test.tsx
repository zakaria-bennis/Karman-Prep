import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import LegalFrame from "./LegalFrame";

it("frames the legal text on the rebuilt pages' sections, with a contents card that jumps to each part", () => {
  const html = renderToStaticMarkup(
    <LegalFrame
      title="Terms of Service"
      intro={<p>Effective date</p>}
      contents={[
        { id: "acceptance", title: "1. Acceptance of Terms" },
        { id: "billing", title: "2. Plans & Billing" },
      ]}
    >
      <section id="acceptance">
        <h2>1. Acceptance of Terms</h2>
        <p>Words, kept exactly.</p>
      </section>
    </LegalFrame>
  );
  expect(html).toContain('class="pg-hero lg-hero"');
  expect(html).toContain('class="sect pg-sect co-tall lg-sect"');
  expect(html).toContain('<article class="co-card legal">');
  expect(html).toContain('href="#acceptance"');
  expect(html).toContain("<span>Plans &amp; Billing</span>");
  // the text itself is untouched, number and all
  expect(html).toContain("<h2>1. Acceptance of Terms</h2><p>Words, kept exactly.</p>");
  // no reveal on the long card: a reveal waits for a share of the element to be on screen, which a very
  // tall card never reaches on a short screen
  expect(html).not.toMatch(/legal[^"]*\brv\b/);
});
