// Rewards: everything here is a stand-in or a first draft, so the page can be designed.
//   Settled by the founder: they are called coins (he tried "tokens" for a day and came back:
//   "tokens are just hard to say", 2026-11-16); coins are earned by
//   leveling up skills, by the score on full-length exams, by time trials, endless mode and the
//   Daily 10; a streak on the challenge question raises a multiplier in steps of 0.25x up to 5x, and
//   a missed day returns it to 1x; a mystery box holds only things to wear, never a character; there
//   are 16 characters, each unlocked by its own challenge and by nothing else, each with a name of
//   its own and a little story, not just its animal's name; the fox is every student's first, and
//   its name is Karman.
//   Coins should also buy things that are of real use (2026-11-16): a pass to start a full-length
//   exam outside its window (he plans for exams to be started only on Saturday, 6 am to midnight),
//   a way to keep a streak through a missed day (he has seen the Streak saver and said it is fine),
//   and a second chance inside a skill set: after a miss the student corrects it and pays coins so
//   the run of right answers still counts and the skill can still level up (his example: three
//   right, one wrong, corrected and paid for, and on to Understanding). Second chances are bought
//   here ahead of time and used inside a skill set; they cannot be bought in the middle of one.
//   Each is priced so it cannot be abused.
//   Themes and skins are off the page: he is rethinking them (perhaps places, such as countries) and
//   light and dark stay tied to day and night.
//   Not settled, and made up here: every price, amount and limit, which things to wear there are,
//   and every character's name, story and challenge (he asked for a draft of those).
import type { FaceKind } from "./characters";
import type { PassKind } from "./RewardsPassIcon";

// 100,000 while he tests the page (his ask, 2026-11-16); a real student starts at none.
export const COINS = 100000;
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
  { name: "Exams", coins: 250 },
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

/** Things of real use that coins buy. Each has a limit, which he set (2026-11-16): the exam pass
 *  once a month, the streak saver once a week, the second chance once in a skill set. The prices are
 *  stand-ins. */
export type Pass = {
  name: string;
  does: string;
  price: number;
  /** How often one may be bought. */
  limit: string;
  icon: PassKind;
  /** More than one may be held at a time. */
  stacks?: boolean;
};
export const PASSES: Pass[] = [
  {
    // one pass for both, the early start and the late one (he asked for them to be one)
    name: "Exam pass",
    does: "Start a full-length exam before or after Saturday",
    price: 3000,
    limit: "1 a month",
    icon: "exam",
  },
  {
    name: "Streak saver",
    does: "Keeps your streak through one missed day",
    price: 1200,
    limit: "1 a week",
    icon: "streak",
  },
  {
    name: "Second chance",
    does: "Correct a miss in a skill set and keep your run going",
    price: 300,
    // bought here and kept for later; it cannot be bought in the middle of a skill set
    limit: "Use 1 a skill set",
    icon: "chance",
    stacks: true,
  },
];

/** Little things worth knowing about the student's coins. */
export const RECORDS = [
  { name: "Lifetime coins", value: "6,420" },
  { name: "Earned today", value: "180" },
  { name: "Best day", value: "640" },
  { name: "Boxes opened", value: "7" },
  { name: "Longest streak", value: "11 days" },
  { name: "Top multiplier", value: "3.75x" },
];

export type Character = {
  /** Its own name. The card never says what animal it is (founder, 2026-11-16). */
  name: string;
  story: string;
  /** How it is unlocked. */
  challenge: string;
  /** How far along the student is: done, out of how many. */
  done: number;
  of: number;
  face: FaceKind;
  /** One of the three hardest to unlock: until then it is a black shape with no name. */
  mystery?: boolean;
};
/** The 16 characters, the easiest first. One not yet unlocked is seen grayed out, except the last
 *  three, the hardest, which are black shapes named "???" until they are unlocked (founder,
 *  2026-11-16: "just like how Subway Surfers does it"). Those three are animals whose outlines
 *  could be several things, so the surprise holds; one with antlers gave itself away and was moved.
 *  The fox is Karman (his name for it). The made-up student has only the fox. */
export const CHARACTERS: Character[] = [
  {
    name: "Karman",
    story: "Your guide from day one. Curious about everything, afraid of no question.",
    challenge: "Yours from the start",
    done: 1,
    of: 1,
    face: "fox",
  },
  {
    name: "Juniper",
    story: "Reads by moonlight and has never once lost her place.",
    challenge: "Finish 10 Daily 10s",
    done: 9,
    of: 10,
    face: "owl",
  },
  {
    name: "Clover",
    story: "Always first to the finish line. Sometimes forgets to stop there.",
    challenge: "Finish 5 time trials",
    done: 3,
    of: 5,
    face: "rabbit",
  },
  {
    name: "Maple",
    story: "Shows up every single morning, rain or frost.",
    challenge: "Answer the challenge question 7 days in a row",
    done: 6,
    of: 7,
    face: "deer",
  },
  {
    name: "Thistle",
    story: "Small, prickly, and very proud of his sharp points. His answers are sharper.",
    challenge: "Bring 10 skills to Proficient",
    done: 8,
    of: 10,
    face: "hedgehog",
  },
  {
    name: "Bruno",
    story: "Two weeks without a miss. He will hibernate after the SAT.",
    challenge: "Answer the challenge question 14 days in a row",
    done: 6,
    of: 14,
    face: "bear",
  },
  {
    name: "Pebble",
    story: "Treats every hard problem like a game she fully intends to win.",
    challenge: "Answer 25 in a row in endless mode",
    done: 14,
    of: 25,
    face: "otter",
  },
  {
    name: "Hazel",
    story: "Saves everything. You never know when a coin will come in handy.",
    challenge: "Earn 5,000 coins",
    done: 1840,
    of: 5000,
    face: "squirrel",
  },
  {
    name: "Reed",
    story: "Can stand still through a whole exam. Ask him how.",
    challenge: "Finish 3 full-length exams",
    done: 2,
    of: 3,
    face: "heron",
  },
  {
    name: "Sable",
    story: "Misses nothing. Not once.",
    challenge: "Get all 10 right in a Daily 10",
    done: 0,
    of: 1,
    face: "lynx",
  },
  {
    name: "Willow",
    story: "Started low and kept rising.",
    challenge: "Raise your predicted score by 200",
    done: 170,
    of: 200,
    face: "crane",
  },
  {
    name: "Rowan",
    story: "Learns a whole territory before moving on to the next.",
    challenge: "Bring every skill in one domain to Proficient",
    done: 5,
    of: 9,
    face: "stag",
  },
  {
    name: "Cinder",
    story: "Rises again every time she falls.",
    challenge: "Look back at 50 missed questions",
    done: 21,
    of: 50,
    face: "phoenix",
  },
  {
    name: "Flint",
    story: "Has run the whole course ten times and would go again.",
    challenge: "Finish 10 full-length exams",
    done: 5,
    of: 10,
    face: "wolf",
    mystery: true,
  },
  {
    name: "Barley",
    story: "Shows up. Every. Single. Day.",
    challenge: "Hold the 5x multiplier for 30 days",
    done: 0,
    of: 30,
    face: "badger",
    mystery: true,
  },
  {
    name: "Saffron",
    story: "Calm at the very top of the tree.",
    challenge: "Bring all 72 skills to Proficient",
    done: 25,
    of: 72,
    face: "redpanda",
    mystery: true,
  },
];
