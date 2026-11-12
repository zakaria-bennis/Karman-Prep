// The receipts on the home page (Receipts.tsx): one row per student, with the text conversation shown on
// the phone beside the list while that row is lit.

export interface ReceiptText {
  from: "them" | "karman";
  text: string;
}

export interface Receipt {
  name: string;
  home: string;
  start: number;
  end: number;
  weeks: number;
  /** A logo file in public/site/schools/, without ".svg". */
  school: string;
  schoolName: string;
  texts: ReceiptText[];
}

/**
 * True while the rows below are made-up samples that stand in for real students. The section is on the
 * live site (founder, 2026-11-11: "keep as is for right now and put on live"), so while this is true the
 * home page prints the "sample note" line from site-copy.ts under the heading, and a sample is never read
 * as a real result. Set it to false only when every row is a real student who agreed to be shown, with the
 * words they really sent; the note then goes away by itself.
 */
export const RECEIPTS_ARE_SAMPLES = true;

const sample = (name: string, start: number, end: number): ReceiptText[] => [
  { from: "them", text: `Sample message from ${name}. The real one goes here.` },
  { from: "karman", text: "Sample reply." },
  { from: "them", text: `Sample: scores are out. ${end}.` },
  { from: "them", text: `Sample: that is ${end - start} more than I started with.` },
  {
    from: "karman",
    text: "Sample reply, a little longer, so the conversation runs past one screen.",
  },
  { from: "them", text: "Sample message from the parent or the student." },
  { from: "karman", text: "Sample reply." },
  {
    from: "them",
    text: "Sample message, two lines long, to show how a longer text sits in the bubble.",
  },
  { from: "karman", text: "Sample reply." },
  { from: "them", text: "Sample: we just heard back from the university." },
  { from: "them", text: "Sample last message. Thank you!" },
];

const row = (
  name: string,
  home: string,
  start: number,
  end: number,
  weeks: number,
  school: string,
  schoolName: string
): Receipt => ({
  name,
  home,
  start,
  end,
  weeks,
  school,
  schoolName,
  texts: sample(name, start, end),
});

export const RECEIPTS: Receipt[] = [
  row("Student A", "Houston, TX", 1180, 1490, 14, "stanford", "Stanford"),
  row("Student B", "Phoenix, AZ", 1240, 1530, 16, "harvard", "Harvard"),
  row("Student C", "Miami, FL", 1090, 1380, 18, "michigan", "Michigan"),
  row("Student D", "Seattle, WA", 1310, 1540, 12, "duke", "Duke"),
  row("Student E", "Denver, CO", 1150, 1450, 16, "columbia", "Columbia"),
  row("Student F", "Minneapolis, MN", 1200, 1470, 15, "ucla", "UCLA"),
  row("Student G", "Charlotte, NC", 1020, 1340, 20, "northwestern", "Northwestern"),
  row("Student H", "Dallas, TX", 1270, 1510, 13, "yale", "Yale"),
  row("Student I", "Chicago, IL", 1130, 1420, 17, "cornell", "Cornell"),
];
