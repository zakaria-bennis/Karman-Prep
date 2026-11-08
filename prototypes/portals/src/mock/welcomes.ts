/**
 * The 200 welcome lines from docs/design/portal-welcomes.md (draft for the founder),
 * as data, with the group each line belongs to. {name} is the first name; a line
 * without it is used when the name is unknown. No em dashes, no jokes about
 * studying, nothing that sounds like a chatbot.
 */
export type WelcomeGroup =
  | "any"
  | "morning"
  | "afternoon"
  | "evening"
  | "late"
  | "weekend"
  | "weekday"
  | "classday"
  | "testseason"
  | "back"
  | "tough";
export interface WelcomeLine {
  id: string;
  group: WelcomeGroup;
  text: string;
}

export const WELCOMES: WelcomeLine[] = [
  { id: "w1", group: "any", text: "Welcome back, {name}" },
  { id: "w2", group: "any", text: "Hey, {name}" },
  { id: "w3", group: "any", text: "Good to see you, {name}" },
  { id: "w4", group: "any", text: "Ready when you are, {name}" },
  { id: "w5", group: "any", text: "Back at it, {name}" },
  { id: "w6", group: "any", text: "Let's get to work, {name}" },
  { id: "w7", group: "any", text: "Pick up where you left off?" },
  { id: "w8", group: "any", text: "One question at a time, {name}" },
  { id: "w9", group: "any", text: "Here for today's question?" },
  { id: "w10", group: "any", text: "Nice to have you back" },
  { id: "w11", group: "any", text: "What are we working on, {name}?" },
  { id: "w12", group: "any", text: "Let's make today count" },
  { id: "w13", group: "any", text: "Your desk is ready, {name}" },
  { id: "w14", group: "any", text: "Good timing, {name}" },
  { id: "w15", group: "any", text: "Ten minutes is enough today" },
  { id: "w16", group: "any", text: "Settle in, {name}" },
  { id: "w17", group: "any", text: "Let's sharpen something" },
  { id: "w18", group: "any", text: "Which section today?" },
  { id: "w19", group: "any", text: "Reading and Writing or Math?" },
  { id: "w20", group: "any", text: "Today's question is waiting" },
  { id: "w21", group: "any", text: "Let's find the next point" },
  { id: "w22", group: "any", text: "Small steps, {name}" },
  { id: "w23", group: "any", text: "You showed up. That's the hard part" },
  { id: "w24", group: "any", text: "Let's warm up, {name}" },
  { id: "w25", group: "any", text: "Steady work wins this" },
  { id: "w26", group: "any", text: "Ready for a few questions?" },
  { id: "w27", group: "any", text: "Let's look at what you missed" },
  { id: "w28", group: "any", text: "Your missed questions are back for review" },
  { id: "w29", group: "any", text: "A quick set, or a long one?" },
  { id: "w30", group: "any", text: "Clear head, clear answers" },
  { id: "w31", group: "any", text: "Hi, {name}. Let's begin" },
  { id: "w32", group: "any", text: "Let's build on last time" },
  { id: "w33", group: "any", text: "Focus mode, {name}" },
  { id: "w34", group: "any", text: "Back for more, {name}?" },
  { id: "w35", group: "any", text: "Let's get one right" },
  { id: "w36", group: "any", text: "Every question teaches something" },
  { id: "w37", group: "any", text: "Let's do the work, {name}" },
  { id: "w38", group: "any", text: "Glad you're here, {name}" },
  { id: "w39", group: "any", text: "Let's keep the streak of good habits" },
  { id: "w40", group: "any", text: "What's first today?" },
  { id: "w41", group: "morning", text: "Good morning, {name}" },
  { id: "w42", group: "morning", text: "Morning, {name}" },
  { id: "w43", group: "morning", text: "Early start, {name}" },
  { id: "w44", group: "morning", text: "Rise and review, {name}" },
  { id: "w45", group: "morning", text: "Good morning. Coffee and a question?" },
  { id: "w46", group: "morning", text: "Bright and early, {name}" },
  { id: "w47", group: "morning", text: "Morning focus is the best focus" },
  { id: "w48", group: "morning", text: "Start the day with one question" },
  { id: "w49", group: "morning", text: "Morning, {name}. Daily 10 is ready" },
  { id: "w50", group: "morning", text: "An early win before school?" },
  { id: "w51", group: "morning", text: "Good morning. Fresh brain, fresh questions" },
  { id: "w52", group: "morning", text: "A quick question before the bus?" },
  { id: "w53", group: "morning", text: "Morning reps, {name}" },
  { id: "w54", group: "morning", text: "The day starts here, {name}" },
  { id: "w55", group: "morning", text: "Breakfast and a passage?" },
  { id: "w56", group: "morning", text: "Up before the alarm, {name}?" },
  { id: "w57", group: "morning", text: "Good morning. Five minutes is plenty" },
  { id: "w58", group: "morning", text: "Morning warm-up, {name}" },
  { id: "w59", group: "morning", text: "Today's question is fresh" },
  { id: "w60", group: "morning", text: "Let's start strong, {name}" },
  { id: "w61", group: "morning", text: "Good morning. One for the ride?" },
  { id: "w62", group: "morning", text: "Morning, {name}. Let's be quick and sharp" },
  { id: "w63", group: "morning", text: "Before first period, one question" },
  { id: "w64", group: "morning", text: "Early bird, {name}" },
  { id: "w65", group: "morning", text: "A calm start, {name}" },
  { id: "w66", group: "afternoon", text: "Good afternoon, {name}" },
  { id: "w67", group: "afternoon", text: "Afternoon, {name}" },
  { id: "w68", group: "afternoon", text: "After school, {name}?" },
  { id: "w69", group: "afternoon", text: "Back from class, {name}?" },
  { id: "w70", group: "afternoon", text: "A study break that counts" },
  { id: "w71", group: "afternoon", text: "Afternoon reset, {name}" },
  { id: "w72", group: "afternoon", text: "Between practice and dinner?" },
  { id: "w73", group: "afternoon", text: "Free period, {name}?" },
  { id: "w74", group: "afternoon", text: "Good afternoon. Ready for a set?" },
  { id: "w75", group: "afternoon", text: "Afternoon focus, {name}" },
  { id: "w76", group: "afternoon", text: "Snack and a question?" },
  { id: "w77", group: "afternoon", text: "Let's use the afternoon well" },
  { id: "w78", group: "afternoon", text: "The afternoon is yours, {name}" },
  { id: "w79", group: "afternoon", text: "Back from practice, {name}?" },
  { id: "w80", group: "afternoon", text: "A few questions before homework?" },
  { id: "w81", group: "afternoon", text: "Good afternoon. Let's warm up" },
  { id: "w82", group: "afternoon", text: "Afternoon reps, {name}" },
  { id: "w83", group: "afternoon", text: "Lunch break study, {name}?" },
  { id: "w84", group: "afternoon", text: "Let's make the afternoon count" },
  { id: "w85", group: "afternoon", text: "Hi, {name}. Long day?" },
  { id: "w86", group: "evening", text: "Good evening, {name}" },
  { id: "w87", group: "evening", text: "Evening, {name}" },
  { id: "w88", group: "evening", text: "Winding down, {name}?" },
  { id: "w89", group: "evening", text: "Evening study, {name}" },
  { id: "w90", group: "evening", text: "How was your day, {name}?" },
  { id: "w91", group: "evening", text: "Live class tonight, {name}?" },
  { id: "w92", group: "evening", text: "After dinner, one more set?" },
  { id: "w93", group: "evening", text: "Evening focus, {name}" },
  { id: "w94", group: "evening", text: "Good evening. Let's review" },
  { id: "w95", group: "evening", text: "The quiet hours, {name}" },
  { id: "w96", group: "evening", text: "Homework done, {name}?" },
  { id: "w97", group: "evening", text: "Evening reps, {name}" },
  { id: "w98", group: "evening", text: "Let's close the day strong" },
  { id: "w99", group: "evening", text: "Good evening. Ready when you are" },
  { id: "w100", group: "evening", text: "One more question before tonight's class?" },
  { id: "w101", group: "evening", text: "Evening, {name}. Let's look at today's misses" },
  { id: "w102", group: "evening", text: "A calm set to end the day" },
  { id: "w103", group: "evening", text: "Dusk and a passage, {name}" },
  { id: "w104", group: "evening", text: "Back after dinner, {name}?" },
  { id: "w105", group: "evening", text: "Let's tidy up today's mistakes" },
  { id: "w106", group: "evening", text: "Good evening. Ten minutes, then rest" },
  { id: "w107", group: "evening", text: "Evening check-in, {name}" },
  { id: "w108", group: "evening", text: "Class is soon, {name}" },
  { id: "w109", group: "evening", text: "Wrapping up the day?" },
  { id: "w110", group: "evening", text: "Hey, {name}. Good evening" },
  { id: "w111", group: "late", text: "Up late, {name}?" },
  { id: "w112", group: "late", text: "Night owl, {name}" },
  { id: "w113", group: "late", text: "Late session, {name}?" },
  { id: "w114", group: "late", text: "Burning the midnight oil?" },
  { id: "w115", group: "late", text: "Quiet hours, clear thinking" },
  { id: "w116", group: "late", text: "One more question, then sleep" },
  { id: "w117", group: "late", text: "Late night review, {name}" },
  { id: "w118", group: "late", text: "Short set tonight, {name}" },
  { id: "w119", group: "late", text: "Still going, {name}?" },
  { id: "w120", group: "late", text: "Hey, {name}. Keep it short tonight" },
  { id: "w121", group: "late", text: "Sleep helps it stick, {name}" },
  { id: "w122", group: "late", text: "A last look before bed?" },
  { id: "w123", group: "late", text: "Night shift, {name}" },
  { id: "w124", group: "late", text: "Late, but here" },
  { id: "w125", group: "late", text: "Rest is part of the plan, {name}" },
  { id: "w126", group: "weekend", text: "Happy Saturday, {name}" },
  { id: "w127", group: "weekend", text: "Happy Sunday, {name}" },
  { id: "w128", group: "weekend", text: "Weekend study, {name}?" },
  { id: "w129", group: "weekend", text: "Saturday practice test, {name}?" },
  { id: "w130", group: "weekend", text: "A slow Sunday set?" },
  { id: "w131", group: "weekend", text: "Weekend reps, {name}" },
  { id: "w132", group: "weekend", text: "Saturday morning, {name}" },
  { id: "w133", group: "weekend", text: "Sunday reset, {name}" },
  { id: "w134", group: "weekend", text: "Weekend focus, {name}" },
  { id: "w135", group: "weekend", text: "Full-length test today?" },
  { id: "w136", group: "weekend", text: "A weekend win, {name}" },
  { id: "w137", group: "weekend", text: "Easy Sunday, steady work" },
  { id: "w138", group: "weekend", text: "Saturday is test practice day" },
  { id: "w139", group: "weekend", text: "Weekend mode, {name}" },
  { id: "w140", group: "weekend", text: "Sunday planning, {name}?" },
  { id: "w141", group: "weekend", text: "Before the weekend gets busy" },
  { id: "w142", group: "weekend", text: "Saturday, {name}. Timer ready?" },
  { id: "w143", group: "weekend", text: "Rest day or review day?" },
  { id: "w144", group: "weekend", text: "After the game, a few questions?" },
  { id: "w145", group: "weekend", text: "Weekend warm-up, {name}" },
  { id: "w146", group: "weekday", text: "Happy Monday, {name}" },
  { id: "w147", group: "weekday", text: "New week, {name}" },
  { id: "w148", group: "weekday", text: "Monday, {name}. Let's set the pace" },
  { id: "w149", group: "weekday", text: "Tuesday class day, {name}" },
  { id: "w150", group: "weekday", text: "Happy Tuesday, {name}" },
  { id: "w151", group: "weekday", text: "Midweek, {name}" },
  { id: "w152", group: "weekday", text: "Happy Wednesday, {name}" },
  { id: "w153", group: "weekday", text: "Thursday class day, {name}" },
  { id: "w154", group: "weekday", text: "Happy Thursday, {name}" },
  { id: "w155", group: "weekday", text: "Happy Friday, {name}" },
  { id: "w156", group: "weekday", text: "Friday, {name}. One more set?" },
  { id: "w157", group: "weekday", text: "End of the week, {name}" },
  { id: "w158", group: "weekday", text: "Before the weekend, {name}" },
  { id: "w159", group: "weekday", text: "Fresh week, fresh questions" },
  { id: "w160", group: "classday", text: "Class tonight at 7, {name}" },
  { id: "w161", group: "classday", text: "Live class soon, {name}" },
  { id: "w162", group: "classday", text: "Warm up before class?" },
  { id: "w163", group: "classday", text: "Ready for tonight's class?" },
  { id: "w164", group: "classday", text: "Class day, {name}" },
  { id: "w165", group: "classday", text: "Fresh from class, {name}?" },
  { id: "w166", group: "classday", text: "Let's practice what class covered" },
  { id: "w167", group: "classday", text: "Good class tonight, {name}?" },
  { id: "w168", group: "classday", text: "Review tonight's lesson?" },
  { id: "w169", group: "classday", text: "Before class, today's question" },
  { id: "w170", group: "testseason", text: "Test week, {name}" },
  { id: "w171", group: "testseason", text: "Steady, {name}. You've done the work" },
  { id: "w172", group: "testseason", text: "A light set this week" },
  { id: "w173", group: "testseason", text: "Keep it calm, {name}" },
  { id: "w174", group: "testseason", text: "Final week, {name}" },
  { id: "w175", group: "testseason", text: "Rest and review, {name}" },
  { id: "w176", group: "testseason", text: "Trust the work, {name}" },
  { id: "w177", group: "testseason", text: "Light practice, early nights" },
  { id: "w178", group: "testseason", text: "Almost there, {name}" },
  { id: "w179", group: "testseason", text: "Test week. Short and sharp" },
  { id: "w180", group: "testseason", text: "The day before: rest, {name}" },
  { id: "w181", group: "testseason", text: "You're ready for this, {name}" },
  { id: "w182", group: "testseason", text: "Pack your bag tonight, {name}" },
  { id: "w183", group: "testseason", text: "Quiet confidence, {name}" },
  { id: "w184", group: "testseason", text: "Last review, {name}" },
  { id: "w185", group: "back", text: "Welcome back, {name}. Missed you" },
  { id: "w186", group: "back", text: "Good to have you back, {name}" },
  { id: "w187", group: "back", text: "Back after a break, {name}?" },
  { id: "w188", group: "back", text: "Let's ease back in, {name}" },
  { id: "w189", group: "back", text: "Fresh start, {name}" },
  { id: "w190", group: "back", text: "A short set to restart?" },
  { id: "w191", group: "back", text: "Picking things back up, {name}?" },
  { id: "w192", group: "back", text: "No pressure. One question" },
  { id: "w193", group: "back", text: "Welcome back. Your plan is here" },
  { id: "w194", group: "back", text: "Let's find your rhythm again" },
  { id: "w195", group: "tough", text: "Mistakes are where points live" },
  { id: "w196", group: "tough", text: "Let's fix yesterday's misses" },
  { id: "w197", group: "tough", text: "Every miss is a lesson, {name}" },
  { id: "w198", group: "tough", text: "Let's turn that miss into a point" },
  { id: "w199", group: "tough", text: "Back for the rematch, {name}?" },
  { id: "w200", group: "tough", text: "Tough set yesterday. Today's better" },
];

export interface WelcomeContext {
  /** Local hour, 0 to 23. */
  hour: number;
  /** 0 Sunday to 6 Saturday. */
  weekday: number;
  classDay?: boolean;
  /** Within two weeks of the SAT. */
  testSeason?: boolean;
  /** More than a week since the last visit. */
  comingBack?: boolean;
  /** Yesterday's set scored under half. */
  toughSet?: boolean;
  /** Seeds the choice so a screenshot is stable; a real app passes the visit count. */
  seed?: number;
}

/** Which groups fit the moment, most specific first. */
export function groupsFor(c: WelcomeContext): WelcomeGroup[] {
  const g: WelcomeGroup[] = [];
  if (c.toughSet) g.push("tough");
  if (c.comingBack) g.push("back");
  if (c.testSeason) g.push("testseason");
  if (c.classDay) g.push("classday");
  if (c.weekday === 0 || c.weekday === 6) g.push("weekend");
  else g.push("weekday");
  if (c.hour >= 5 && c.hour < 12) g.push("morning");
  else if (c.hour >= 12 && c.hour < 17) g.push("afternoon");
  else if (c.hour >= 17 && c.hour < 22) g.push("evening");
  else g.push("late");
  g.push("any");
  return g;
}

const DAY_WORDS: Record<number, RegExp> = {
  1: /monday/i,
  2: /tuesday/i,
  3: /wednesday/i,
  4: /thursday/i,
  5: /friday/i,
  6: /saturday/i,
  0: /sunday/i,
};

/** One line for the moment, never the one shown last time. */
export function pickWelcome(c: WelcomeContext, lastId: string | null, hasName = true): WelcomeLine {
  const groups = groupsFor(c);
  let pool = WELCOMES.filter((w) => groups.slice(0, 2).includes(w.group));
  if (hasName === false) pool = pool.filter((w) => !w.text.includes("{name}"));
  // A weekday line names a day; keep only lines for today's day, or lines that name none.
  pool = pool.filter((w) => {
    const named = Object.entries(DAY_WORDS).find(([, re]) => re.test(w.text));
    return !named || Number(named[0]) === c.weekday;
  });
  pool = pool.filter((w) => w.id !== lastId);
  if (!pool.length) pool = WELCOMES.filter((w) => w.group === "any" && w.id !== lastId);
  const i = Math.abs((c.seed ?? c.hour * 7 + c.weekday) * 2654435761) % pool.length;
  return pool[i];
}

console.assert(WELCOMES.length === 200, `200 welcome lines, got ${WELCOMES.length}`);
console.assert(
  WELCOMES.every((w) => !/[\u2014\u2013]/.test(w.text)),
  "no dashes in the welcomes"
);
console.assert(
  pickWelcome({ hour: 9, weekday: 6 }, null).id !==
    pickWelcome({ hour: 9, weekday: 6 }, pickWelcome({ hour: 9, weekday: 6 }, null).id).id,
  "never the same line twice in a row"
);
