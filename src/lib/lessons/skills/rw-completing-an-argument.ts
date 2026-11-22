import type { Lesson } from "../types";

const lesson: Lesson = {
  id: "rw-completing-an-argument",
  tests:
    "Choosing the ending that must follow from the facts in a short text. The answer comes from the text alone, not from what you know about the world.",
  spot: "The text ends in a blank, often right after This suggests that or Therefore, and the question asks which choice most logically completes the text.",
  idea: [
    "The text lays out facts like links in a chain. The blank is the **next link**: what those facts add up to.",
    "The right ending **must be true** if the text is true. A choice that only might be true, or that needs outside facts, is wrong.",
    "Watch the **signal words**: but, however, because, therefore. The words just before the blank tell you what kind of ending to write.",
    "A common shape: an old belief, then a fact that does not fit it. The ending says the belief is **wrong or incomplete**.",
  ],
  rules: ["Fact + fact = the blank", "Must be true beats might be true", "No outside facts"],
  figure: {
    kind: "passage",
    text: "Sea otters in one bay ate mostly sea urchins. After a disease wiped out the bay's urchins, the otters did not leave or go hungry. Instead, they began eating crabs and clams. This suggests that the otters ______",
    marks: [
      { find: "ate mostly sea urchins", tone: "blue", note: "Fact A" },
      { find: "did not leave or go hungry", tone: "blue", note: "Fact B" },
      { find: "Instead,", tone: "gold", note: "Signal" },
      { find: "This suggests that", tone: "warm", note: "Ending: they can switch foods" },
    ],
  },
  strategy: {
    name: "Fact plus fact",
    steps: [
      "Read the whole text and mark the signal words.",
      "Write the chain: fact A plus fact B leads to what?",
      "Predict the ending in your own words.",
      "Pick the choice that must follow from the text alone.",
    ],
  },
  examples: [
    {
      title: "Old belief",
      passage:
        "Many gardeners believe that tomato plants need full sun all day to produce fruit. In a recent trial, however, plants that got sun only in the morning produced just as many tomatoes as plants that got sun all day. This suggests that ______",
      problem: "Which choice most logically completes the text?",
      choices: [
        "morning sun gives tomato plants more energy than afternoon sun.",
        "tomato plants may not need full sun all day to produce fruit.",
        "tomato plants grow best when they are kept in the shade.",
        "full sun all day harms tomato plants.",
      ],
      right: 1,
      steps: [
        {
          say: "Mark the signals. Believe sets up an old idea, and however says the trial breaks it.",
        },
        {
          say: "Write the chain: gardeners think plants need sun all day, but half-day plants did just as well.",
        },
        { say: "Predict: the belief is wrong. Plants do not need sun all day." },
        {
          say: "Only the choice that says plants may not need full sun all day must be true. More energy and growing best in shade need facts the text never gives, and nothing shows full sun does harm.",
        },
      ],
      answer: "tomato plants may not need full sun all day to produce fruit.",
      checkIn: {
        text: "Which choice most logically completes the text?",
        passage:
          "Many people believe that cats cannot be trained to follow commands. In one study, however, shelter cats learned to sit and to come when called after just two weeks of short daily lessons with treats. This suggests that ______",
        choices: [
          "cats learn commands faster than dogs do.",
          "cats can never learn more than two commands.",
          "only shelter cats can be trained.",
          "cats may be more trainable than many people believe.",
        ],
        right: 3,
        why: "The study shows cats learning commands, which goes against the old belief, so the careful conclusion is that cats may be more trainable than people think. Nothing compares cats with dogs, the **Possible but unsupported** trap.",
        twin: {
          text: "Which choice most logically completes the text?",
          passage:
            "Many people think that teenagers learn best late at night, when the house is quiet. In one study, however, students who studied in the early evening remembered more the next day than students who studied after 11 p.m. This suggests that ______",
          choices: [
            "studying late at night may not be the best choice for teenagers.",
            "teenagers should never study after dinner.",
            "teenagers remember more when they study with music.",
            "the quiet of late night helps teenagers remember more.",
          ],
          right: 0,
          why: 'Early-evening studiers remembered more than late-night studiers, which goes against the old belief, so the careful conclusion is that late night may not be best. "Never after dinner" goes too far, the **Too extreme** trap, and the last choice says the opposite of the study, the **Opposite** trap.',
        },
      },
    },
    {
      title: "Ruling out",
      passage:
        "After a week of storms, a town's well water turned cloudy. Engineers named three possible causes: a cracked pipe, a broken pump, or runoff from heavy rain. Tests found no cracks in the pipes, and the pump was working normally. Therefore, the most likely cause is ______",
      problem: "Which choice most logically completes the text?",
      choices: [
        "a crack in one of the pipes.",
        "the town's aging water filter.",
        "runoff from heavy rain.",
        "a mix of all three causes.",
      ],
      right: 2,
      steps: [
        { say: "Mark the signal. Therefore means the blank is the conclusion of the tests." },
        { say: "Write the chain: three possible causes, and the tests rule out two of them." },
        { say: "Predict: the cause left standing, which is runoff." },
        {
          say: "Pick runoff from heavy rain. A crack and a mix of all three go against the tests, and the water filter is never mentioned.",
        },
      ],
      answer: "runoff from heavy rain.",
      tryFrom: 2,
      checkIn: {
        text: "Which choice most logically completes the text?",
        passage:
          "A school's gym lights kept flickering. The custodian listed three possible causes: loose bulbs, a bad switch, or old wiring. He tightened every bulb, and the lights still flickered. He then replaced the switch, and the flickering went on. Therefore, the most likely cause is ______",
        choices: [
          "a loose bulb.",
          "a power outage in the town.",
          "a mix of all three causes.",
          "the old wiring.",
        ],
        right: 3,
        why: "Tightening the bulbs and replacing the switch did not stop the flickering, so those two causes are ruled out. Only the old wiring is left. A power outage was never on the list, the **Possible but unsupported** trap.",
        twin: {
          text: "Which choice most logically completes the text?",
          passage:
            "A baker's bread kept coming out flat. She listed three possible causes: old yeast, an oven that was too cool, or too little kneading. She bought fresh yeast, and the bread was still flat. She checked the oven with a thermometer and found it at the right heat. Therefore, the most likely cause is ______",
          choices: [
            "too little kneading.",
            "the old yeast.",
            "the type of flour she used.",
            "an oven that was too cool.",
          ],
          right: 0,
          why: "Fresh yeast did not fix the bread, and the oven was at the right heat, so those causes are ruled out. Only too little kneading is left. The flour was never on the list, the **Possible but unsupported** trap.",
        },
      },
    },
  ],
  traps: [
    {
      name: "Possible but unsupported",
      text: "The choice sounds reasonable in real life, but nothing in the text gives a reason for it. If you need an outside fact to defend it, cross it out.",
    },
    {
      name: "Opposite",
      text: "The choice flips the logic, often with a small not or by swapping who does what. Check it against each fact in the chain.",
    },
    {
      name: "Too extreme",
      text: "Words like proves, always, all and never claim more than a few facts can show. The modest choice that must be true beats the bold one.",
    },
  ],
  tip: {
    kind: "reading",
    title: "Say the chain aloud",
    steps: [
      "Before the choices, say the chain in one line: because of this and this, ______.",
      "Fill your blank with the smallest claim that fits.",
      "Hold each choice to one test: if the text is true, must this be true too?",
    ],
  },
  check: {
    passage:
      "Some scientists thought that a certain songbird learned its song only by copying its parents. But birds raised in a lab, where they never heard an adult bird, still sang the full song by their first spring. This suggests that the songbird ______",
    text: "Which choice most logically completes the text?",
    choices: [
      "never copies sounds from other birds.",
      "learns its song faster in a lab than in the wild.",
      "sings mainly to attract a mate.",
      "can develop its song without hearing adults sing it.",
    ],
    right: 3,
    why: "Fact plus fact: scientists thought the song came only from copying, but birds that never heard adults sang it anyway. So the song can develop without hearing adults. Never copies sounds is too extreme: the text shows only that copying is not needed. Learning faster in a lab and singing to attract a mate are possible but unsupported, since the text says nothing about either.",
  },
  quiz: [
    {
      passage:
        "A museum's paintings began to fade. Staff listed three possible causes: sunlight from a new window, heat from the lights, or damp air. They covered the window, and the fading went on. They measured the air and found it dry. This suggests that the fading is most likely caused by ______",
      text: "Which choice most logically completes the text?",
      choices: [
        "sunlight from the new window.",
        "damp air in the gallery.",
        "heat from the lights.",
        "the age of the paint.",
      ],
      right: 2,
      why: "Rule causes out until one is left. Covering the window did not stop the fading, so sunlight is out. The air was dry, so damp air is out. Heat from the lights is the cause left standing. The age of the paint is the possible but unsupported trap: the text never raises it. Sunlight and damp air are the opposite of what the staff's tests showed.",
      subject: "reading",
    },
    {
      passage:
        "Engineers once assumed that taller wind turbines always produce more power. At one coastal site, however, the shortest turbines produced the most power, because the winds there were strongest near the ground. This suggests that ______",
      text: "A student wants to complete this text. What should the student do first?",
      choices: [
        "Pick the choice that sounds the most scientific.",
        "Mark the signal words however and because, and see how the facts connect.",
        "Think about what is true of wind turbines in real life.",
        "Read only the sentence with the blank to save time.",
      ],
      right: 1,
      why: "The first move is to mark the signals. However says the coastal result breaks the old idea, and because gives the reason. Now the chain is clear: engineers assumed taller is better, but here shorter won because of low winds. Thinking about real turbines brings in outside facts, the possible but unsupported trap. Picking the most scientific choice skips the prediction. Reading only the last sentence misses both facts.",
      subject: "reading",
    },
    {
      passage:
        "A small lizard on one island was long thought to stay underground all winter. Trail cameras, however, recorded the lizards coming out to bask on warm winter days and then going back underground. This suggests that the lizards ______",
      text: "A student completed the text with are active all winter long. Why is that choice wrong?",
      choices: [
        "It is the opposite of the text: the cameras showed the lizards never came out.",
        "It needs outside facts about how lizards keep warm.",
        "It is not wrong: the cameras proved the old belief false.",
        "It is too extreme: the cameras showed the lizards out only on warm days.",
      ],
      right: 3,
      why: "The cameras show the lizards leave their burrows on warm winter days, then go back. So the safe ending is that they do not stay underground all winter. Active all winter long stretches that to every day, which is too extreme. It is not the opposite, because the lizards did come out. It needs no outside facts; it simply says more than the text shows. And it is wrong, since the text gives only warm days.",
      subject: "reading",
    },
    {
      text: "Which of these questions asks you to add up a text's facts into the ending they lead to?",
      choices: [
        "A text ends in a blank after This suggests that, and you pick the most logical ending.",
        "A blank starts a sentence, and you pick the most logical transition.",
        "A text has no blank, and you pick the choice that best states its main idea.",
        "A blank sits inside a sentence, and you pick the choice that follows grammar rules.",
      ],
      right: 0,
      why: "When a text ends in a blank after This suggests that, the blank is a conclusion, so you chain the facts and predict where they lead. A blank that starts a sentence asks for a transition: you judge how two sentences link, not what they prove. A main idea question has no blank and asks for the point of the whole text. A blank inside a sentence with a grammar rule tests punctuation or verbs, not logic.",
      subject: "reading",
    },
    {
      passage:
        "Archaeologists studying a village abandoned about 900 years ago first assumed that a long drought drove its people away. But soil layers from that time show normal rainfall, and the village's storage pits still held large amounts of grain. Meanwhile, a new village with the same style of pottery appeared about 20 kilometers away in the same years. These findings suggest that the villagers ______",
      text: "Which choice most logically completes the text?",
      choices: [
        "died out after their crops failed during the drought.",
        "were forced out by a rival group that took over the village.",
        "most likely moved to a nearby site for some reason other than drought.",
        "proved that droughts never caused villages to be abandoned.",
      ],
      right: 2,
      why: "Chain the facts. Normal rainfall and full grain pits rule out drought and hunger. A new village with the same pottery appeared nearby at the same time. Add them up: the people likely moved there, and drought was not the reason. A rival group is possible but unsupported, since the text never mentions one. Dying out in a drought is the opposite of the soil and grain facts. Proving droughts never cause abandonment is too extreme.",
      subject: "reading",
    },
  ],
};

export default lesson;
