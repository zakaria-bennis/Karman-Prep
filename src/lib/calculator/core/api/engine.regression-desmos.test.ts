import { expect, it } from "vitest";
import { createTestEngine, TEST_VIEW } from "./__fixtures__/test-engine";

// What live Desmos fitted for the same rows (probes of 2026-10-28; see REGRESSION-14, -15 in
// b-functions-and-data.md D-26): a parameter that only matters in a product keeps the value 1,
// and a restriction `{…}` makes the parameters it reads the searched ones while the others are
// solved exactly, from a start moved just inside any constant limit (limit ± 1).

async function fit(rows: string[]) {
  const m = createTestEngine(undefined, { backend: "main-thread" });
  m.engine.setExpressions(rows.map((latex, k) => ({ id: `e${k}`, latex })));
  m.engine.setView(TEST_VIEW);
  await m.settled();
  const row = m.engine.getSnapshot().rows.find((r) => r.id === `e${rows.length - 1}`);
  return row?.regression?.result;
}
const values = async (rows: string[]) => (await fit(rows))?.params.map((p) => p.value);
const R = (c: string) => `\\left\\{${c}\\right\\}`;
const list = (name: string, v: number[]) => `${name}_{1}=\\left[${v.join(",")}\\right]`;

it("REGRESSION-14 a parameter that only appears in a product keeps 1 (a·b·x, a·b^x)", async () => {
  const a = [list("x", [1, 2, 3, 4, 5]), list("y", [2.1, 3.9, 6.2, 7.8, 10.1])];
  const p1 = await values([...a, "y_{1}\\sim abx_{1}"]);
  expect(p1?.[0]).toBeCloseTo(2.00364, 4);
  expect(p1?.[1]).toBeCloseTo(1, 9);
  const b = [list("x", [1, 2, 3]), list("y", [3, 5, 7])];
  const p2 = await values([...b, "y_{1}\\sim abx_{1}"]);
  expect(p2?.[0]).toBeCloseTo(2.42857, 4);
  expect(p2?.[1]).toBeCloseTo(1, 9);
  const e = [list("x", [1, 2]), list("y", [3, 7])];
  const p3 = await values([...e, "y_{1}\\sim abx_{1}+c"]);
  expect(p3?.[0]).toBeCloseTo(4, 6);
  expect(p3?.[1]).toBeCloseTo(1, 9);
  expect(p3?.[2]).toBeCloseTo(-1, 6);
  const f = [list("x", [1]), list("y", [5])];
  const p4 = await values([...f, "y_{1}\\sim ab^{x_{1}}"]);
  expect(p4?.[0]).toBeCloseTo(5, 6);
  expect(p4?.[1]).toBeCloseTo(1, 9);
});

// restriction, a + b ~ 115 (a and b are the parameters)
const SUM = "a+b\\sim115";
const single: [string, number, number][] = [
  ["a>0", 1, 114],
  ["a>0.5", 1, 114],
  ["a>-5", 1, 114],
  ["a<100", 1, 114],
  ["0<a<115", 1, 114],
  ["b>0", 114, 1],
  ["a>1", 2, 113],
  ["a>2", 3, 112],
  ["a>1.5", 2.5, 112.5],
  ["a>10", 11, 104],
  ["a<0", -1, 116],
  ["a<-3", -4, 119],
  ["a<0.5", -0.5, 115.5],
  ["a<1", 0, 115],
  ["b>1", 113, 2],
  ["b>5", 109, 6],
  ["115>a>b>0", 114, 1],
];
for (const [cond, a, b] of single) {
  it(`REGRESSION-15 ${SUM}${R(cond)} fits a=${a}, b=${b}, as Desmos does`, async () => {
    const p = await values([SUM + R(cond)]);
    expect(p?.[0]).toBeCloseTo(a, 6);
    expect(p?.[1]).toBeCloseTo(b, 6);
  });
}

it("REGRESSION-15 a restriction between the parameters is unchanged (a>b, b>a)", async () => {
  const p = await values([SUM + R("a>b")]);
  expect(p?.[0]).toBeCloseTo(131.8, 6);
  expect(p?.[1]).toBeCloseTo(-16.8, 6);
  const q = await values([SUM + R("b>a")]);
  expect(q?.[0]).toBeCloseTo(-2.15, 6);
  expect(q?.[1]).toBeCloseTo(117.15, 6);
});

it("REGRESSION-15 the other parameters are solved exactly, from 0 when the start moved", async () => {
  expect(await values([`2a+b\\sim115${R("a>1")}`])).toEqual([
    expect.closeTo(2, 6),
    expect.closeTo(111, 6),
  ]);
  expect(await values([`a^{2}+b\\sim115${R("a>1")}`])).toEqual([
    expect.closeTo(2, 6),
    expect.closeTo(111, 6),
  ]);
  const three = "a+b+c\\sim115";
  expect(await values([three + R("a>1")])).toEqual([
    expect.closeTo(2, 6),
    expect.closeTo(113, 6),
    expect.closeTo(0, 6),
  ]);
  expect(await values([three + R("a>0")])).toEqual([
    expect.closeTo(1, 6),
    expect.closeTo(113, 6),
    expect.closeTo(1, 6),
  ]);
  expect(await values([three + R("c>1")])).toEqual([
    expect.closeTo(113, 6),
    expect.closeTo(0, 6),
    expect.closeTo(2, 6),
  ]);
});

it("REGRESSION-15 the user's two-coordinate equation with 115>a>b>0 fits a=114, b=1", async () => {
  const eq =
    "\\left[a+b,\\left(\\frac{a\\left(2\\sqrt{226}\\right)}{2}\\right)+\\left(\\frac{b\\left(2\\sqrt{226}\\right)}{2}\\right)\\right]\\sim\\left[115,2\\left(\\frac{115\\cdot\\sqrt{226}}{2}\\right)\\right]";
  const p = await values([eq + R("115>a>b>0")]);
  expect(p?.[0]).toBeCloseTo(114, 6);
  expect(p?.[1]).toBeCloseTo(1, 6);
});

it("REGRESSION-15 a one-sided interval sits one inside its limit; a two-sided one at its middle", async () => {
  const p = await values(["a^{2}\\sim16" + R("-5<a<-3")]);
  expect(p?.[0]).toBeCloseTo(-4, 6);
});

it("REGRESSION-15 a restricted line fits at the limit when the best line is outside it", async () => {
  const d = [list("x", [1, 2, 3, 4, 5]), list("y", [2.1, 3.9, 6.2, 7.8, 10.1])];
  const a = await fit([...d, "y_{1}\\sim mx_{1}+b" + R("m>3")]);
  expect(a?.params[0].value).toBeCloseTo(3, 4);
  expect(a?.params[1].value).toBeCloseTo(-2.98, 3);
  const b = await fit([...d, "y_{1}\\sim mx_{1}+b" + R("b<0")]);
  expect(b?.params[0].value).toBeCloseTo(2.00364, 3);
  expect(Math.abs(b?.params[1].value ?? 1)).toBeLessThan(1e-4);
  expect(b?.r2).toBeCloseTo(0.9972, 3);
});

it("REGRESSION-15 which parameters are linear is decided without the restriction (ab, a>0)", async () => {
  const free = await values(["ab\\sim6"]);
  expect(free?.[0]).toBeCloseTo(6, 6);
  expect(free?.[1]).toBeCloseTo(1, 6);
  const p = await values(["ab\\sim6" + R("a>0")]);
  expect(p?.[0]).toBeCloseTo(Math.sqrt(6), 5);
  expect(p?.[1]).toBeCloseTo(Math.sqrt(6), 5);
});
