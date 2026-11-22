import type { Lesson } from "../types";

const lesson: Lesson = {
  id: "rw-comparing-two-texts",
  tests:
    "Reading two short texts on one topic and saying where the authors agree or where they differ.",
  spot: "Text 1 and Text 2 sit side by side, and the question asks what both authors would most likely agree with, or how their views differ.",
  idea: [
    "Two texts on one topic do not always disagree. Often Text 2 **grants** part of Text 1 and adds a limit. A but in Text 2 may belong to its own argument, not attack Text 1.",
    "For an **agree** question, find the smallest, plainest idea both authors would accept. Agreement answers are usually broad and modest.",
    "For a **differ** question, name the exact point where the two split. Then check every part of a choice against both texts, not just one.",
  ],
  rules: [
    "Sum up each text in one line",
    "Agree: the smallest shared idea",
    "Differ: the exact point of the split",
  ],
  figure: {
    kind: "twoTexts",
    a: { title: "Text 1", claim: "Adding bike lanes makes city streets safer for everyone." },
    b: {
      title: "Text 2",
      claim: "Bike lanes make streets safer, but mainly when a barrier separates them from cars.",
    },
    relation: "qualify",
    note: "Shared ground: bike lanes can make streets safer.",
  },
  strategy: {
    name: "Sum up, then compare",
    steps: [
      "Read the question first: agree or differ?",
      "Sum up each text's main claim in one line.",
      "Agree: find the smallest idea both accept. Differ: name the exact split.",
      "Check every part of the choice against both texts.",
    ],
  },
  examples: [
    {
      title: "Shared ground",
      passage:
        "**Text 1:** Many museums now let visitors photograph the art. Supporters say that photos shared online bring new visitors through the doors, especially young people who rarely came before.\n\n**Text 2:** Allowing photos can draw new visitors, but it has a cost. People who stop to take pictures spend less time looking at the art itself, and they often remember less of what they saw.",
      problem: "Based on the texts, both authors would most likely agree with which statement?",
      choices: [
        "Taking photos helps visitors remember the art they see.",
        "Allowing photos can bring new visitors to museums.",
        "Museums should ban photos in every gallery.",
        "Visitors who take photos remember less of what they saw.",
      ],
      right: 1,
      steps: [
        { say: "Read the question first: it asks where the authors **agree**." },
        { say: "Sum up Text 1: allowing photos brings in new visitors." },
        {
          say: "Sum up Text 2: photos can draw visitors, but people look less and remember less.",
        },
        {
          say: "Both accept that photos can draw visitors. Remembering less is true of Text 2 alone, a ban goes beyond both, and the first choice contradicts Text 2.",
        },
      ],
      answer: "Allowing photos can bring new visitors to museums.",
      checkIn: {
        text: "Based on the texts, both authors would most likely agree with which statement?",
        passage:
          "**Text 1:** Four-day school weeks save districts money on buses and heating. Families in some towns also like the longer weekend for family time and part-time jobs.\n\n**Text 2:** A four-day week can cut costs, but the school days get longer, and younger students often struggle to stay focused through the extra hours.",
        choices: [
          "Younger students focus better during longer school days.",
          "Every district should switch to a four-day week.",
          "A four-day school week can save money.",
          "Longer school days are hard for younger students.",
        ],
        right: 2,
        why: "Both texts say a four-day week can cut costs. Only Text 2 says long days are hard on younger students, so that choice is the **Half right** trap, and neither text says every district should switch.",
        twin: {
          text: "Based on the texts, both authors would most likely agree with which statement?",
          passage:
            "**Text 1:** Self-driving cars could cut traffic crashes, since most crashes are caused by human mistakes. They may also give older people who no longer drive a way to get around.\n\n**Text 2:** Self-driving cars may well reduce crashes caused by human error. Still, their software can fail in snow or heavy rain, and no one yet knows how they will handle every road.",
          choices: [
            "Self-driving cars could reduce crashes caused by human mistakes.",
            "Self-driving cars work well in snow and heavy rain.",
            "Self-driving cars may help older people who no longer drive.",
            "All cars should be self-driving within ten years.",
          ],
          right: 0,
          why: "Both texts say self-driving cars could reduce crashes caused by people's mistakes. Only Text 1 mentions older people, the **Half right** trap, and Text 2 says the software can fail in bad weather.",
        },
      },
    },
    {
      title: "The exact split",
      passage:
        "**Text 1:** Many scientists argue that the dinosaurs died out mainly because a huge asteroid struck Earth about 66 million years ago, throwing up dust that blocked sunlight.\n\n**Text 2:** Other scientists agree that an asteroid struck but point out that giant volcanic eruptions in India were already warming the planet and poisoning the seas. In their view, the dinosaurs were in trouble before the asteroid arrived.",
      problem:
        "Which choice best describes a difference in how the two texts explain the extinction of the dinosaurs?",
      choices: [
        "Text 1 says volcanoes weakened the dinosaurs first, while Text 2 says the asteroid alone killed them.",
        "Text 1 says an asteroid struck Earth, while Text 2 says no asteroid ever struck.",
        "Text 1 says dust blocked sunlight, while Text 2 says the dust warmed the planet.",
        "Text 1 treats the asteroid as the main cause, while Text 2 says volcanoes had already put the dinosaurs at risk.",
      ],
      right: 3,
      steps: [
        { say: "Read the question first: it asks for a **difference**." },
        { say: "Sum up Text 1: the asteroid was the main cause." },
        {
          say: "Sum up Text 2: yes, an asteroid struck, but volcanoes had already put the dinosaurs at risk. The split is whether the asteroid acted alone.",
        },
        {
          say: "Match. The first choice swaps the authors, Text 2 never denies the asteroid, and Text 2 says the volcanoes, not the dust, warmed the planet.",
        },
      ],
      answer:
        "Text 1 treats the asteroid as the main cause, while Text 2 says volcanoes had already put the dinosaurs at risk.",
      tryFrom: 2,
      checkIn: {
        text: "Which choice best describes a difference in how the two texts explain the spread of new ideas?",
        passage:
          "**Text 1:** Some historians argue that the printing press spread new ideas across Europe mainly because books became cheap enough for ordinary people to buy.\n\n**Text 2:** Other historians agree that books became cheaper but argue that rising reading skills mattered more. In their view, cheap books would have changed little if most people still could not read.",
        choices: [
          "Text 1 says reading skills mattered most, while Text 2 says cheap books mattered most.",
          "Text 1 credits mainly cheaper books, while Text 2 says rising reading skills mattered more.",
          "Text 1 says books became cheaper, while Text 2 says books became more expensive.",
          "Text 1 says the printing press spread ideas, while Text 2 says it had no effect at all.",
        ],
        right: 1,
        why: 'Both texts accept that books became cheaper; they split on what mattered most. Text 1 points to cheap books, Text 2 to reading skills. The first choice gives each text the other\'s view, the **Swapped authors** trap, and "no effect at all" is the **Too extreme** trap.',
        twin: {
          text: "Which choice best describes a difference in how the two texts explain the drop in honeybee numbers?",
          passage:
            "**Text 1:** Many biologists think honeybee numbers are falling mainly because of a tiny mite that spreads disease through hives.\n\n**Text 2:** Other biologists agree the mite is harmful but argue that the loss of wildflowers matters more. Bees that cannot find enough food, they say, are too weak to fight off the mite in the first place.",
          choices: [
            "Text 1 says the mite is harmless, while Text 2 says it kills every hive.",
            "Text 1 says lost wildflowers matter most, while Text 2 says the mite matters most.",
            "Text 1 says bees eat wildflowers, while Text 2 says bees avoid them.",
            "Text 1 treats the mite as the main cause, while Text 2 says lost wildflowers leave bees too weak to resist it.",
          ],
          right: 3,
          why: "Both texts agree the mite is harmful; they split on the main cause. Text 1 blames the mite, Text 2 the loss of wildflowers that weakens bees. The second choice swaps the two views, the **Swapped authors** trap.",
        },
      },
    },
  ],
  traps: [
    {
      name: "Half right",
      text: "The choice is true of one text but not the other. For an agree question, it must fit both.",
    },
    {
      name: "Swapped authors",
      text: "The choice gives Text 1's view to Text 2, or the reverse. Check which text says what before you pick.",
    },
    {
      name: "Too extreme",
      text: "Words like always, every or completely go further than a careful author would. Agreement answers are usually modest.",
    },
  ],
  tip: {
    kind: "reading",
    title: "Look before the but",
    steps: [
      "When Text 2 says yes, but, the part before the but is what it grants.",
      "What Text 2 grants and Text 1 claims is usually the shared ground.",
      "What comes after the but is usually the point where they differ.",
    ],
  },
  check: {
    passage:
      "**Text 1:** Learning a second language is easier in childhood than in adulthood, because young children pick up the sounds and grammar of a language naturally.\n\n**Text 2:** Children do pick up the sounds of a new language more easily than adults. Adults, however, often learn vocabulary and grammar faster at first, because they can study the rules on purpose.",
    text: "Based on the texts, both authors would most likely agree with which statement?",
    choices: [
      "Adults learn grammar faster than children do.",
      "Adults can never learn a second language well.",
      "Children pick up the sounds of a new language easily.",
      "Children learn grammar faster than adults do.",
    ],
    right: 2,
    why: "Text 1 says children pick up sounds naturally, and Text 2 grants that children pick up sounds more easily, so both accept that point. Adults learning grammar faster is only Text 2's view. Children learning grammar faster is only Text 1's view, and Text 2 disputes it. Never is too extreme for either text.",
  },
  quiz: [
    {
      passage:
        "**Text 1:** Modern zoos protect endangered animals by breeding them and, in some cases, returning them to the wild. Without zoos, several species would have vanished.\n\n**Text 2:** Breeding programs have saved a few species, but most zoo animals are not endangered at all. Zoos exist mainly to entertain visitors, and conservation is a small part of what they do.",
      text: "Which choice best describes a difference in how the authors view zoos?",
      choices: [
        "Text 1 says zoos mainly entertain visitors, while Text 2 sees zoos mainly as places for conservation.",
        "Text 1 says breeding programs have failed, while Text 2 says they have saved many species.",
        "Text 1 sees zoos mainly as places for conservation, while Text 2 sees conservation as a small part of their work.",
        "Text 1 says every zoo should grow, while Text 2 says every zoo should close.",
      ],
      right: 2,
      why: "Sum up each text: Text 1 says zoos protect endangered animals; Text 2 says conservation is a small part of what zoos do. That is the split. The entertain choice is the **Swapped authors** trap. Text 1 never says breeding failed, and Text 2 says it saved only a few species. Every zoo growing or closing is the **Too extreme** trap and in neither text.",
      subject: "reading",
    },
    {
      passage:
        "**Text 1:** Planting wildflowers along the edges of farm fields gives wild bees food and shelter, and nearby crops get more visits from pollinators.\n\n**Text 2:** Wildflower strips can help wild bees, but they work best when they are wide and close to the crops. A thin strip far from the field does little.",
      text: "A question asks what both authors would most likely agree with. After reading both texts, what should a student do first?",
      choices: [
        "Sum up each text's main claim in one line",
        "Pick the choice that matches Text 1 most closely",
        "Look for the strongest statement, since agreement needs a firm claim",
        "Treat the but in Text 2 as an attack on everything in Text 1",
      ],
      right: 0,
      why: "Sum up each text first: Text 1 says wildflowers help bees and crops; Text 2 says they help, but mainly when wide and close. Then the shared idea is easy to see. Matching Text 1 alone leads to Half right. The strongest statement leads to Too extreme. The but in Text 2 adds a limit; it does not reject Text 1.",
      subject: "reading",
    },
    {
      passage:
        "**Text 1:** Standing desks are good for office workers. People who stand for part of the day report less back pain and more energy.\n\n**Text 2:** Standing desks can ease back pain, but standing all day brings its own problems, such as sore feet and tired legs. The best plan is to switch between sitting and standing.",
      text: "A student chose this answer: both authors would agree that office workers should stand all day. Why is this answer wrong?",
      choices: [
        "It swaps the authors, giving Text 2's view to Text 1.",
        "It names a problem that neither text mentions.",
        "It is wrong only because Text 1 never mentions back pain.",
        "It is too extreme: Text 1 praises standing for part of the day, and Text 2 warns against standing all day.",
      ],
      right: 3,
      why: "The answer is the **Too extreme** trap. Text 1 speaks of standing for part of the day, and Text 2 says standing all day causes problems, so neither author would accept it. It is not Swapped authors, since neither text holds this view. Sore feet and tired legs do appear in Text 2. Text 1 does mention back pain.",
      subject: "reading",
    },
    {
      passage:
        "**Text 1:** Daylight saving time should be kept all year. Lighter evenings encourage people to exercise and shop after work.\n\n**Text 2:** Year-round daylight saving time would leave winter mornings dark for hours after many people wake up. Sleep scientists favor year-round standard time instead, which better matches the body's clock to the sun.",
      text: "Which choice best describes a difference between the authors' views?",
      choices: [
        "Both authors want to stop changing the clocks twice a year.",
        "Text 1 favors keeping daylight saving time all year, while Text 2 favors keeping standard time all year.",
        "Text 1 favors keeping standard time all year, while Text 2 favors keeping daylight saving time all year.",
        "Text 1 says lighter evenings matter, while Text 2 says the time of sunrise does not matter at all.",
      ],
      right: 1,
      why: "This is a differ question, so name the exact split: both want one time all year, but Text 1 picks daylight saving time and Text 2 picks standard time. Stopping the clock changes is the look-alike: it is their shared ground, not a difference. The reversed choice is the **Swapped authors** trap. Text 2 cares a great deal about sunrise, so does not matter at all is the **Too extreme** trap.",
      subject: "reading",
    },
    {
      passage:
        "**Text 1:** Coral reefs are often called the rainforests of the sea. They cover a tiny share of the ocean floor, yet about a quarter of all ocean species depend on them at some point in their lives.\n\n**Text 2:** Reefs are rich in life, but warming seas are putting that richness at risk. When water stays too warm for weeks, corals lose the algae that feed them and turn white, and many never recover.",
      text: "Based on the texts, both authors would most likely agree with which statement?",
      choices: [
        "Coral reefs cover a large share of the ocean floor.",
        "Most corals that turn white never recover.",
        "Coral reefs support a great variety of ocean life.",
        "Warming seas will destroy every coral reef within a few years.",
      ],
      right: 2,
      why: "Text 1 says a quarter of ocean species depend on reefs, and Text 2 opens by granting that reefs are rich in life; its but adds a threat, not a disagreement. So both accept that reefs support many kinds of life. Most never recover is the **Half right** trap: Text 2 says many, and Text 1 is silent. Every reef within a few years is the **Too extreme** trap. Text 1 says reefs cover a tiny share.",
      subject: "reading",
    },
  ],
};

export default lesson;
