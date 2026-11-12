import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";

vi.mock("@/app/(site)/schools/school-call-actions", () => ({ submitSchoolCall: vi.fn() }));

import SchoolsSections from "./SchoolsSections";

it("sends every main button to the book-a-call card, not an email", () => {
  const html = renderToStaticMarkup(<SchoolsSections />);
  expect(html).not.toContain("mailto:");
  expect(html).toContain('id="call"');
  expect(html).toContain('href="#call"');
  expect(html).toContain("65 districts already use Karman");
  expect(html).toContain("Step 1 of 2");
});
