// Shared helpers for the v2 transfer specs (14). No tests: Playwright's default testMatch skips it.
import type { Page } from "@playwright/test";

export const url = (flow = "diagnostic", extra = "") =>
  `/?flow=${flow}&calc=v2&questions=transfer${extra}`;
export const xq = (s: string) => `"${s}"`;
// KaTeX's <annotation> is a MathML element, which an XPath name test in an HTML document never
// matches (the name test matches HTML-namespace elements only), so the paths use local-name().
const ANNOTATION = `*[local-name()="annotation"]`;
/** KaTeX annotations whose source is the given latex. */
export const annotations = (page: Page, latex: string) =>
  page.locator(`xpath=//${ANNOTATION}[normalize-space()=${xq(latex)}]`);
/** The controls whose item (the anchor's previous sibling) renders the given latex. */
export const anchors = (page: Page, latex: string) =>
  page.locator(
    `xpath=//*[@data-transfer-control][preceding-sibling::*[1][.//${ANNOTATION}[normalize-space()=${xq(latex)}]]]`
  );
export const anchor = (page: Page, latex: string, n = 0) => anchors(page, latex).nth(n);
export const choiceControl = (page: Page, letter: string) =>
  page.getByRole("button", { name: `Transfer to Calculator: choice ${letter}`, exact: true });
export const allControls = (page: Page) =>
  page.getByRole("button", { name: /^Transfer to Calculator: / });
/** A DOM click: a calculator window may cover the button. */
export const press = (page: Page, name: string) =>
  page.getByRole("button", { name, exact: true }).evaluate((el: HTMLElement) => el.click());
