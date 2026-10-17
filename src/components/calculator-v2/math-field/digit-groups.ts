// T-10 digit grouping for results: the integer part of each number gets a thin space (U+2009)
// every three digits from the right. A run of digits after "." is fractional and stays as it is,
// and exponents never reach four digits. The grouped text is display only: it never goes back
// into the engine, the API, the corpus display strings or speech text.

export function groupIntegerDigits(text: string): string {
  return text.replace(
    /(^|[^0-9.])([0-9]{4,})/g,
    (_: string, pre: string, run: string) => pre + run.replace(/\B(?=(\d{3})+$)/g, "\u2009")
  );
}
