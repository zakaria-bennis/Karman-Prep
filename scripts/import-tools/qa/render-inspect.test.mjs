// node --test scripts/import-tools/qa/render-inspect.test.mjs  (synthetic pages only)
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { inspectPage } from "./render-inspect.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const { chromium } = createRequire(path.join(root, "package.json"))("playwright");
let browser;
let page;
before(async () => {
  browser = await chromium.launch();
  page = await browser.newPage({ viewport: { width: 390, height: 844 } });
});
after(() => browser.close());

const shell = (left, right) => `<body style="margin:0"><section id="qa-render" style="width:360px">
  <div data-question-layout style="display:grid;grid-template-columns:1fr">
    <div>${left}</div><div>${right}</div></div></section></body>`;

async function check(html, expected = null) {
  await page.setContent(html);
  return page.evaluate(inspectPage, { expected });
}

test("a clean question has no failures", async () => {
  const r = await check(shell("<p>A short passage.</p>", "<p>Which choice?</p>"));
  assert.deepEqual(r.failures, {});
});

test("sideways overflow, katex errors and an empty column are reported", async () => {
  const r = await check(
    shell(
      "",
      '<div style="width:900px">wide</div><span class="katex-error" title="ParseError">x</span>'
    )
  );
  assert.ok(r.failures.page_overflow);
  assert.ok(r.failures.element_overflow);
  assert.ok(r.failures.katex_error);
  assert.ok(r.failures.empty_column);
});

test("a figure the row has but the screen does not draw is reported", async () => {
  const r = await check(shell("<p>Passage.</p>", "<p>Stem?</p>"), "table");
  assert.ok(r.failures.figure_missing);
  const z = await check(
    shell(
      '<figure class="themed-question-figure"><svg width="0" height="0"></svg></figure>',
      "<p>Stem?</p>"
    ),
    "svg"
  );
  assert.ok(z.failures.figure_empty);
});

test("overlapping blocks are reported", async () => {
  const r = await check(
    shell(
      "<p>Passage.</p>",
      '<div style="height:40px">one</div><div style="margin-top:-30px;height:40px">two</div>'
    )
  );
  assert.ok(r.failures.text_overlap);
});
