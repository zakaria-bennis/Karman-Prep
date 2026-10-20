import { expect, it } from "vitest";
import { latexToSpeech } from "./speech";

it("T-5 speech text for the T-5 examples", () => {
  expect(latexToSpeech("y=x^{2}+\\frac{3}{4}")).toBe("y equals x squared plus 3 fourths");
  expect(latexToSpeech("y=\\sqrt{x}+\\pi")).toBe("y equals Start Root, x, End Root plus pi");
});
it("T-5 speech text covers every Phase 1 tree head", () => {
  const cases: [string, string][] = [
    ["", ""],
    ["2x", "2 x"],
    ["3\\cdot4", "3 times 4"],
    ["x^{3}", "x cubed"],
    ["x^{4}", "x Superscript, 4, Baseline"],
    ["e^{-x}", "e Superscript, negative x, Baseline"],
    ["\\frac{1}{2}", "1 half"],
    ["\\frac{5}{2}", "5 halves"],
    ["\\frac{1}{3}", "1 third"],
    ["\\frac{2}{3}", "2 thirds"],
    ["\\frac{x}{12}", "Start Fraction, x Over 12, End Fraction"],
    ["\\sqrt[3]{x}", "Start Cube Root, x, End Cube Root"],
    ["\\sqrt[4]{x}", "Start Root Index 4, x, End Root"],
    ["\\left|x-1\\right|", "Start Absolute Value, x minus 1, End Absolute Value"],
    ["-\\left(x+1\\right)", "negative left parenthesis x plus 1 right parenthesis"],
    ["a-\\left(b+c\\right)", "a minus left parenthesis b plus c right parenthesis"],
    ["\\left(x+1\\right)^{2}", "left parenthesis x plus 1 right parenthesis squared"],
    ["\\sin\\left(x+1\\right)", "sine of left parenthesis x plus 1 right parenthesis"],
    ["\\sin x^{2}", "sine of x squared"],
    ["\\sin^{2}x", "left parenthesis sine of x right parenthesis squared"],
    ["\\log_{2}x", "log base 2 of x"],
    ["\\ln x", "natural log of x"],
    ["\\left(2,3\\right)", "left parenthesis 2 comma 3 right parenthesis"],
    ["0\\le x<10", "0 less than or equal to x less than 10"],
    ["y\\ge2x+1", "y greater than or equal to 2 x plus 1"],
    ["A_{1}+\\theta", "upper A sub 1 plus theta"],
    ["44\\%\\operatorname{of}2", "44 percent times 2"],
    ["30^{\\circ}", "30 degrees"],
    ["f(x)=x^{2}", "f of x equals x squared"],
  ];
  for (const [latex, speech] of cases) expect(latexToSpeech(latex), latex).toBe(speech);
});
it("T-5 speech text names integer fractions with denominators 2 to 10 by their ordinal words", () => {
  const singular = [
    "half",
    "third",
    "fourth",
    "fifth",
    "sixth",
    "seventh",
    "eighth",
    "ninth",
    "tenth",
  ];
  const plural = [
    "halves",
    "thirds",
    "fourths",
    "fifths",
    "sixths",
    "sevenths",
    "eighths",
    "ninths",
    "tenths",
  ];
  singular.forEach((word, i) => {
    const d = i + 2;
    expect(latexToSpeech(`\\frac{1}{${d}}`)).toBe(`1 ${word}`);
    expect(latexToSpeech(`\\frac{2}{${d}}`)).toBe(`2 ${plural[i]}`);
    expect(latexToSpeech(`\\frac{10}{${d}}`)).toBe(`10 ${plural[i]}`);
  });
  expect(latexToSpeech("\\frac{1}{11}")).toBe("Start Fraction, 1 Over 11, End Fraction");
  expect(latexToSpeech("\\frac{1.5}{2}")).toBe("Start Fraction, 1.5 Over 2, End Fraction");
});
it("T-5 speech text speaks every Phase 1 function name as words", () => {
  const cases: [string, string][] = [
    ["\\sin x", "sine of x"],
    ["\\cos x", "cosine of x"],
    ["\\tan x", "tangent of x"],
    ["\\csc x", "cosecant of x"],
    ["\\sec x", "secant of x"],
    ["\\cot x", "cotangent of x"],
    ["\\arcsin x", "arc sine of x"],
    ["\\arccos x", "arc cosine of x"],
    ["\\arctan x", "arc tangent of x"],
    ["\\operatorname{arccsc}x", "arc cosecant of x"],
    ["\\operatorname{arcsec}x", "arc secant of x"],
    ["\\operatorname{arccot}x", "arc cotangent of x"],
    ["\\ln x", "natural log of x"],
    ["\\log x", "log of x"],
    ["\\exp(x)", "exp of x"],
  ];
  for (const [latex, speech] of cases) expect(latexToSpeech(latex), latex).toBe(speech);
});
it("T-5 LaTeX that does not parse has no tree speech", () => {
  expect(latexToSpeech("x+")).toBe("");
  expect(latexToSpeech("\\frac{}{}")).toBe("");
});
it("T-10 speech text never contains digit grouping", () => {
  expect(latexToSpeech("1234567")).toBe("1234567");
  expect(latexToSpeech("12345.678+1")).toBe("12345.678 plus 1");
});
