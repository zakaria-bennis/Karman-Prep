import type { Lesson } from "../types";

const lesson: Lesson = {
  id: "rw-plurals-and-possessives",
  tests:
    "Choosing between plural, possessive and contraction forms: sisters, sister's, sisters', and its or it's, their or they're.",
  spot: "The choices are the same word with the apostrophe in different places, or with no apostrophe at all.",
  idea: [
    "An **apostrophe** in a noun shows ownership. A plain plural, meaning more than one, never needs one: <i>The farmers sold apples.</i>",
    "To tell them apart, look right after the word for an **owned thing**. <i>The farmer's truck</i> has one owner. <i>The farmers' trucks</i> have many owners.",
    "Pronouns work the other way. Its, their and whose show ownership with **no apostrophe**. It's, they're and who's are short for it is, they are and who is.",
  ],
  rules: [
    "More than one: farmers",
    "One owner: farmer's",
    "Many owners: farmers'",
    "its = belonging to it; it's = it is",
  ],
  figure: {
    kind: "words",
    sentence: "The two ______ nests sat side by side in the old oak tree.",
    words: [
      { word: "robins", fit: false, note: "plural, but nothing owned" },
      { word: "robin's", fit: false, note: "only one owner" },
      { word: "robins'", fit: true, note: "two robins own the nests" },
      { word: "robins's", fit: false, note: "not a correct form" },
    ],
  },
  strategy: {
    name: "Look for the owned thing",
    steps: [
      "Ask whether the word owns the noun right after it.",
      "Nothing owned: a plain plural, with no apostrophe.",
      "One owner: add 's. More than one owner ending in s: add an apostrophe after the s.",
      "For pronouns, say the contraction in full. If it is or they are does not fit, use its or their.",
    ],
  },
  examples: [
    {
      title: "Two owners",
      passage:
        "The two sisters opened a small bookstore together right after college. Today, the ______ shop is known across the city for its cozy reading nook and its gray cat, Pickles.",
      problem:
        "Which choice completes the text so that it conforms to the conventions of Standard English?",
      choices: ["sister's", "sisters", "sisters'", "sisters's"],
      right: 2,
      steps: [
        {
          say: "Look right after the blank: shop. The shop belongs to the sisters, so the word needs an apostrophe.",
        },
        { say: "Count the owners: the two sisters, so **more than one**." },
        { say: "More than one owner ending in s takes an apostrophe after the s: sisters'." },
        {
          say: "Sisters has no apostrophe, so it owns nothing. Sister's gives the shop to one sister. Sisters's is not a correct form.",
        },
      ],
      answer: "sisters'",
      checkIn: {
        text: "Which choice completes the text so that it conforms to the conventions of Standard English?",
        passage:
          "The three brothers built a treehouse in their backyard last summer. The ______ treehouse now has a rope ladder and a small window.",
        choices: ["brothers'", "brother's", "brothers", "brothers's"],
        right: 0,
        why: "Three brothers own one treehouse, so take the plural, brothers, and add an apostrophe after the s: brothers'. Brother's would mean one brother owns it, the **Wrong number of owners** trap, and brothers with no apostrophe shows no owner at all.",
        twin: {
          text: "Which choice completes the text so that it conforms to the conventions of Standard English?",
          passage:
            "Both teams practiced on the same field all week. On Saturday, the two ______ coaches shook hands before the game began.",
          choices: ["team's", "teams'", "teams", "teams's"],
          right: 1,
          why: "Two teams each have a coach, so use the plural, teams, with an apostrophe after the s: teams'. Team's points to one team, the **Wrong number of owners** trap, and teams with no apostrophe shows no ownership.",
        },
      },
    },
    {
      title: "Two words change",
      passage:
        "Sea turtles return to the beach where they hatched to lay their own eggs. A mother turtle digs a nest in the sand with ______ and then covers the eggs before crawling back to the sea.",
      problem:
        "Which choice completes the text so that it conforms to the conventions of Standard English?",
      choices: [
        "it's back flippers",
        "its back flippers",
        "its back flipper's",
        "it's back flipper's",
      ],
      right: 1,
      steps: [
        {
          say: "Two words change: its or it's, and flippers or flipper's. Check each one on its own.",
        },
        {
          say: "Say it's in full: digs a nest with it is back flippers. That makes no sense, so use its.",
        },
        {
          say: "Do the flippers own anything? The word after them is and, so nothing is owned: the plain plural flippers.",
        },
        { say: "Only its back flippers gets both words right." },
      ],
      answer: "its back flippers",
      tryFrom: 2,
      checkIn: {
        text: "Which choice completes the text so that it conforms to the conventions of Standard English?",
        passage:
          "The old oak tree in the town square is over two hundred years old. Every fall, ______ leaves turn bright orange before they drop.",
        choices: ["it's", "its'", "its", "it is"],
        right: 2,
        why: "The leaves belong to the tree, so use the possessive its, with no apostrophe. It's and it is both mean \"it is,\" which makes no sense here, the **Its or it's** trap, and its' is never correct.",
        twin: {
          text: "Which choice completes the text so that it conforms to the conventions of Standard English?",
          passage:
            "A hermit crab does not grow its own shell. When ______ current shell gets too small, the crab moves into a larger empty one.",
          choices: ["its", "it's", "its'", "it is"],
          right: 0,
          why: "The shell belongs to the crab, so use the possessive its, with no apostrophe. It's means \"it is,\" the **Its or it's** trap, and its' is never correct.",
        },
      },
    },
  ],
  traps: [
    {
      name: "Plural apostrophe",
      text: "<i>The scientist's tested the water</i> is wrong when nothing is owned. More than one, with nothing owned, is a plain plural: scientists.",
    },
    {
      name: "Its or it's",
      text: "It's always means it is or it has. To show that something belongs to it, write its, with no apostrophe.",
    },
    {
      name: "Wrong number of owners",
      text: "The one-owner form, sister's, cannot stand for two sisters, and sisters' cannot stand for one. Count the owners before you place the apostrophe.",
    },
  ],
  tip: {
    kind: "reading",
    title: "Say it in full",
    steps: [
      "For its, their or whose, say the long form out loud: it is, they are, who is.",
      "If the long form makes sense, use the apostrophe. If not, use the form without one.",
      "For a noun, look at the next word. If it is owned, add an apostrophe; if not, keep the plural plain.",
    ],
  },
  check: {
    passage:
      "After months of long shifts, the city's bus drivers asked the transit office for new schedules this fall. ______ hoping the changes will give them longer breaks between routes.",
    text: "Which choice completes the text so that it conforms to the conventions of Standard English?",
    choices: ["Their", "There", "They're", "Theyre"],
    right: 2,
    why: "Say the contraction in full: they are hoping the changes will give them longer breaks. That makes sense, so the answer is they're. Their shows ownership, but nothing follows for the drivers to own; the next word is hoping. There points to a place. Theyre is missing its apostrophe, so it is not a word.",
  },
  quiz: [
    {
      passage:
        "A beaver builds a home, called a lodge, from sticks and mud in the middle of a pond. The lodge keeps the beaver safe because ______ are hidden underwater, where few predators can reach them.",
      text: "Which choice completes the text so that it conforms to the conventions of Standard English?",
      choices: ["it's only door's", "its only door's", "its only doors", "it's only doors"],
      right: 2,
      why: "Check each word on its own. Say it's in full: because it is only doors are hidden. That makes no sense, so use its. Next, the doors own nothing, since the word after them is are, so they take the plain plural doors. Only the choice its only doors gets both words right. The tempting it's only doors falls for Its or it's. The two choices with door's fall for the **Plural apostrophe** trap.",
      subject: "reading",
    },
    {
      passage:
        "The town's youth baseball league has eight teams and more than a hundred players. The ______ season ended early this year after heavy rain flooded both of its fields.",
      text: "The choices for the blank are leagues, league's, leagues' and leagues's. What should you do first?",
      choices: [
        "Look at the word after the blank, season, and ask whether it is owned.",
        "Pick leagues, since the league is made up of eight teams.",
        "Pick leagues', since eight teams make many owners.",
        "Pick the choice with no apostrophe, since apostrophes are for contractions.",
      ],
      right: 0,
      why: "Start by looking for the owned thing. The season belongs to the league, and there is one league, so the answer is league's. Picking leagues' because of the eight teams is the **Wrong number of owners** trap: the owner is the one league, not the teams. Picking leagues ignores the ownership and makes the league plural. Apostrophes show ownership in nouns, not only contractions.",
      subject: "reading",
    },
    {
      passage:
        "Every spring, volunteers count the frogs that live in the marsh behind the school. This year, more than 200 frogs were spotted by the ______ in just two nights of searching.",
      text: "A student chose volunteer's for the blank. Why is that choice wrong?",
      choices: [
        "It should be volunteers', because there are many volunteers.",
        "It should be volunteer, because the frogs are the subject.",
        "It should be volunteers's, because the word is plural.",
        "Nothing belongs to the volunteers, so the word is the plain plural volunteers.",
      ],
      right: 3,
      why: "Look for the owned thing. The word after the blank is in, so the volunteers own nothing here, and the word is the plain plural volunteers. The student fell for the **Plural apostrophe** trap. Volunteers' fixes the count but still shows ownership that is not there, the Wrong number of owners mix-up. Volunteer is singular, and the passage says volunteers. Volunteers's is not a correct form.",
      subject: "reading",
    },
    {
      text: "In which sentence does the blank need an apostrophe after the s, as in owners'?",
      choices: [
        "The ______ of the three shops met to plan a street fair.",
        "All three ______ shops will stay open late for the street fair.",
        "Only one ______ shop will sell lemonade at the street fair.",
        "The three ______ agreed to close early on the day of the street fair.",
      ],
      right: 1,
      why: "Look for an owned thing, then count the owners. In the sentence about all three shops, the shops belong to three owners, so it needs owners'. In the sentence about one shop, there is a single owner, so it needs owner's; owners' there is the **Wrong number of owners** trap. In the other two sentences, the word after the blank is of or agreed, so nothing is owned and the plain plural owners fits.",
      subject: "reading",
    },
    {
      passage:
        "For decades, two rival bakeries stood on opposite corners of Elm Street, each claiming to make the town's best bread. Last spring, the owners finally joined forces. Now both ______ best recipes are sold in one shop, and the line often runs out the door.",
      text: "Which choice completes the text so that it conforms to the conventions of Standard English?",
      choices: ["bakery's", "bakeries", "bakeries'", "bakerie's"],
      right: 2,
      why: "Look for the owned thing: the recipes belong to the bakeries. Both says there are two owners, and the plural of bakery is bakeries, so the apostrophe goes after the s: bakeries'. The tempting bakery's is the **Wrong number of owners** trap, since it gives the recipes to one bakery. Bakeries is a plain plural that shows no ownership. Bakerie's is not a correct spelling.",
      subject: "reading",
    },
  ],
};

export default lesson;
