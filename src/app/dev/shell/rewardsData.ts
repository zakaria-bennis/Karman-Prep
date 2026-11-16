// Rewards: everything here is a stand-in or a first draft, so the page can be designed.
//   Settled by the founder: coins are earned by leveling up skills, by the score on full-length
//   exams, by time trials, endless mode and the Daily 10; a streak on the challenge question raises a
//   multiplier in steps of 0.25x up to 5x, and a missed day returns it to 1x; coins buy mystery boxes,
//   themes and quiz-engine skins; a box holds only things to wear, never a character (founder,
//   2026-11-16); there are 16 characters, each unlocked by its own challenge and by nothing else;
//   the fox is every student's first.
//   Not settled, and made up here: every price and amount, what the themes and skins are, which
//   things to wear there are, and the 15 other characters with their challenges (he asked for a
//   draft of those).

export const COINS = 1840;
/** Days in a row with the challenge question answered. */
export const STREAK = 6;
export const TOP = 5;
/** 1x with no streak, a quarter more for each day in a row, never above 5x. */
export const multiplierFor = (days: number) => Math.min(TOP, 1 + days * 0.25);
/** How many days in a row reach the top. */
export const DAYS_TO_TOP = (TOP - 1) / 0.25;

/** Coins earned this week, by where they came from. */
export const EARNED = [
  { name: "Daily 10", coins: 420 },
  { name: "Skill levels", coins: 300 },
  { name: "Full-length exam", coins: 250 },
  { name: "Time trials", coins: 120 },
  { name: "Endless mode", coins: 90 },
];

export const BOX_PRICE = 500;

export type Wear = "glasses" | "hat" | "crown" | "leaf";
/** What a mystery box can hold: things the student's character wears, and nothing else. These four
 *  are stand-ins. */
export const PRIZES: { key: Wear; name: string }[] = [
  { key: "glasses", name: "Round glasses" },
  { key: "hat", name: "Party hat" },
  { key: "crown", name: "Crown" },
  { key: "leaf", name: "Spring leaf" },
];

export type Good = { name: string; price: number; look: string };
/** Themes change the portal's sky and light. */
export const THEMES: Good[] = [
  {
    name: "Sunrise",
    price: 0,
    look: "radial-gradient(120% 90% at 50% 120%, #7fa98f 0 38%, transparent 39%), linear-gradient(#b9c6e8, #f6d7c0 60%, #f9c79b)",
  },
  {
    name: "Golden hour",
    price: 600,
    look: "radial-gradient(120% 90% at 50% 120%, #8a7a4a 0 38%, transparent 39%), linear-gradient(#e9a65c, #f6c98a 55%, #fbe3b5)",
  },
  {
    name: "Night",
    price: 800,
    look: "radial-gradient(120% 90% at 50% 120%, #1f2b3a 0 38%, transparent 39%), radial-gradient(2px 2px at 30% 28%, #fff 99%, transparent), radial-gradient(2px 2px at 68% 18%, #fff 99%, transparent), linear-gradient(#141a3a, #3a3f73)",
  },
  {
    name: "First snow",
    price: 1200,
    look: "radial-gradient(120% 90% at 50% 120%, #f4f6fb 0 38%, transparent 39%), linear-gradient(#c7d3e6, #e9eef7)",
  },
];
/** Skins change how a question looks while it is being answered. */
export const SKINS: Good[] = [
  {
    name: "Classic",
    price: 0,
    look: "linear-gradient(#fffaf0 0 0) 16% 30% / 68% 9% no-repeat, linear-gradient(#fffaf0 0 0) 16% 52% / 46% 9% no-repeat, linear-gradient(#0a5a43 0 0) 16% 76% / 30% 13% no-repeat, #d9c9ae",
  },
  {
    name: "Chalkboard",
    price: 400,
    look: "linear-gradient(#f3f1e6 0 0) 16% 30% / 68% 9% no-repeat, linear-gradient(#f3f1e6 0 0) 16% 52% / 46% 9% no-repeat, linear-gradient(#f2c14e 0 0) 16% 76% / 30% 13% no-repeat, #2f4a40",
  },
  {
    name: "Paper",
    price: 400,
    look: "linear-gradient(#3b3442 0 0) 16% 30% / 68% 7% no-repeat, linear-gradient(#3b3442 0 0) 16% 52% / 46% 7% no-repeat, linear-gradient(#b8683c 0 0) 16% 76% / 30% 13% no-repeat, repeating-linear-gradient(#fbf6ea 0 13px, #e3d9c4 13px 14px)",
  },
  {
    name: "Midnight",
    price: 900,
    look: "linear-gradient(#cfd6ff 0 0) 16% 30% / 68% 9% no-repeat, linear-gradient(#cfd6ff 0 0) 16% 52% / 46% 9% no-repeat, linear-gradient(#8fe6c3 0 0) 16% 76% / 30% 13% no-repeat, #1b1f3d",
  },
];

export type Character = {
  name: string;
  /** How it is unlocked. */
  challenge: string;
  /** How far along the student is: done, out of how many. */
  done: number;
  of: number;
};
/** The 16 characters. The fox is drawn; the other 15 are a draft of names and challenges only, and
 *  since they have no pictures yet the made-up student has unlocked none of them. */
export const CHARACTERS: Character[] = [
  { name: "Fox", challenge: "Yours from the start", done: 1, of: 1 },
  { name: "Owl", challenge: "Finish 10 Daily 10s", done: 9, of: 10 },
  { name: "Rabbit", challenge: "Finish 5 time trials", done: 3, of: 5 },
  { name: "Hedgehog", challenge: "Bring 10 skills to Proficient", done: 8, of: 10 },
  { name: "Deer", challenge: "Answer the challenge question 7 days in a row", done: 6, of: 7 },
  { name: "Otter", challenge: "Answer 25 in a row in endless mode", done: 14, of: 25 },
  { name: "Squirrel", challenge: "Earn 5,000 coins", done: 1840, of: 5000 },
  { name: "Heron", challenge: "Finish 3 full-length exams", done: 2, of: 3 },
  { name: "Badger", challenge: "Look back at 50 missed questions", done: 21, of: 50 },
  { name: "Lynx", challenge: "Get all 10 right in a Daily 10", done: 0, of: 1 },
  { name: "Bear", challenge: "Answer the challenge question 30 days in a row", done: 6, of: 30 },
  { name: "Wolf", challenge: "Bring every skill in one domain to Proficient", done: 5, of: 9 },
  { name: "Crane", challenge: "Raise your predicted score by 200", done: 170, of: 200 },
  { name: "Red panda", challenge: "Reach the 5x multiplier", done: 6, of: 16 },
  { name: "Stag", challenge: "Finish 10 full-length exams", done: 5, of: 10 },
  { name: "Phoenix", challenge: "Bring all 72 skills to Proficient", done: 25, of: 72 },
];
