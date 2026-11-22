import type { Lesson } from "../types";

const NOTES = "While researching a topic, a student has taken these notes:";
const ASK =
  "Which choice most effectively uses relevant information from the notes to accomplish this goal?";

const lesson: Lesson = {
  id: "rw-notes-writing-for-a-goal",
  tests:
    "Choosing the sentence that uses a student's notes to do one stated job, such as emphasize a point, explain a fact, or introduce a topic to new readers.",
  spot: "A list of notes, then a question that starts with The student wants to and names a goal.",
  idea: [
    "Every notes question gives a **goal**. The goal is the whole question: the right sentence does that job, and the notes only supply the facts.",
    "Mark the goal's **verb** and the words after it. Emphasize means that point is the main idea of the sentence. Introduce means you first say what the thing is.",
    "Most wrong choices are **true but off goal**. They state real facts from the notes but do a different job. So test each choice against the goal, not against the notes.",
  ],
  rules: [
    "Emphasize X: X is the main point",
    "Generalize: a broad claim about a group",
    "Give an example: one specific case",
    "Introduce: say what it is first",
  ],
  figure: {
    kind: "notes",
    goal: "Emphasize how far the Arctic tern travels each year.",
    notes: [
      "The Arctic tern is a small seabird.",
      "It weighs about 100 grams.",
      "It flies from the Arctic to Antarctica and back every year.",
      "The round trip is about 70,000 kilometers.",
      "It eats mostly small fish.",
    ],
    pick: [2, 3],
  },
  strategy: {
    name: "Goal first, notes last",
    steps: [
      "Read the goal and mark its verb: emphasize, explain, introduce, generalize.",
      "Predict what the right sentence must say.",
      "Test each choice: does it do that job on its own?",
      "Check the notes only to confirm a fact the goal needs.",
    ],
  },
  examples: [
    {
      title: "Emphasize a point",
      passage: `${NOTES}\n· Dragon fruit grows on a climbing cactus.\n· Its flowers open only at night.\n· Each flower lasts a single night.\n· Bats and moths carry its pollen from flower to flower.`,
      problem: `The student wants to emphasize how short a time a dragon fruit flower is open. ${ASK}`,
      choices: [
        "Dragon fruit grows on a climbing cactus, and bats and moths carry its pollen.",
        "The dragon fruit flower, which opens at night, is visited by bats and moths.",
        "Each dragon fruit flower opens after dark and lasts only that one night.",
        "Dragon fruit flowers are pollinated by bats and moths, two animals active at night.",
      ],
      right: 2,
      steps: [
        {
          say: "The goal's verb is **emphasize**, and the point is how short a time the flower is open.",
        },
        { say: "Predict: the main part of the sentence must say the flower lasts only one night." },
        { say: "Test the choices. Only the third makes the single night its main point." },
        {
          say: "The first and last are true but off goal. The second tucks night into a side clause and never says how long the flower lasts.",
        },
      ],
      answer: "Each dragon fruit flower opens after dark and lasts only that one night.",
    },
    {
      title: "A generalization",
      passage: `${NOTES}\n· Some animals store food to survive the winter.\n· The red squirrel hides pine cones in piles.\n· The acorn woodpecker drills holes in trees and fills each one with an acorn.\n· The pika dries grass and flowers in piles among rocks.`,
      problem: `The student wants to make a generalization about how some animals prepare for winter. ${ASK}`,
      choices: [
        "The pika dries grass and flowers in piles among rocks to eat later.",
        "Some animals, such as squirrels, woodpeckers and pikas, store food to get through the winter.",
        "The acorn woodpecker drills holes in trees and fills each hole with an acorn.",
        "The red squirrel hides pine cones, while the pika dries grass among rocks.",
      ],
      right: 1,
      steps: [
        {
          say: "The goal's verb is **generalize**, so the sentence must be a broad claim about a group.",
        },
        { say: "Predict: some animals store food to get through the winter." },
        {
          say: "Test: three choices describe specific animals and make no broad claim. Naming two animals is still specific.",
        },
        {
          say: "Only the second makes the broad claim, with the animals named as members of the group.",
        },
      ],
      answer:
        "Some animals, such as squirrels, woodpeckers and pikas, store food to get through the winter.",
      tryFrom: 2,
    },
  ],
  traps: [
    {
      name: "True but off goal",
      text: "Every fact in the choice is in the notes, but the sentence does a different job. Accurate is not enough; it must match the goal.",
    },
    {
      name: "Buried point",
      text: "The fact the goal asks you to emphasize sits in a side clause, such as one starting with which, while the main clause says something else.",
    },
    {
      name: "Wrong level",
      text: "One or two examples when the goal asks for a generalization, or a broad claim when the goal asks for one example.",
    },
  ],
  tip: {
    kind: "reading",
    title: "Cover the notes",
    steps: [
      "Read the goal, then cover the notes with your hand or scrap paper.",
      "Read each choice and ask: would this sentence do the job for a reader who never saw the notes?",
      "Keep the one that does. Look at the notes only if two choices still seem to work.",
    ],
  },
  check: {
    passage: `${NOTES}\n· The kora is a string instrument from West Africa.\n· It has 21 strings.\n· Its body is made from a large gourd covered with cow skin.\n· Players pluck it with the thumbs and first fingers of both hands.`,
    text: `The student wants to introduce the kora to an audience unfamiliar with it. ${ASK}`,
    choices: [
      "The kora has 21 strings and a body made from a large gourd.",
      "The kora, a string instrument from West Africa, has a body made from a large gourd.",
      "Players of the kora use the thumbs and first fingers of both hands.",
      "The kora's large gourd body is covered with cow skin.",
    ],
    right: 1,
    why: "To introduce something to readers who have never heard of it, the sentence must first say what it is. Only the choice calling the kora a string instrument from West Africa does that. The others give true details about its strings, its players or its cow skin, but a new reader still would not learn what the kora is or where it comes from. They are true but off goal.",
  },
  quiz: [
    {
      passage: `${NOTES}\n· Some plants spread their seeds by wind.\n· A dandelion seed floats on a tuft of fine hairs.\n· A maple seed spins like a helicopter blade as it falls.\n· A milkweed seed drifts on silky threads.`,
      text: `The student wants to make a generalization about seeds that travel by wind. ${ASK}`,
      choices: [
        "A maple seed spins like a helicopter blade as it falls from the tree.",
        "A dandelion seed floats on fine hairs, and a milkweed seed drifts on silky threads.",
        "A milkweed seed drifts away from its plant on silky threads.",
        "Some plants, such as the dandelion, maple and milkweed, have seeds shaped to ride the wind.",
      ],
      right: 3,
      why: "The goal is a generalization, so the sentence must make a broad claim about a group. Only the choice saying some plants have seeds shaped to ride the wind does that, with three plants named as members of the group. The tempting choice pairs the dandelion and the milkweed, but two cases side by side are still specific: the **Wrong level** trap. The maple choice and the milkweed choice each give just one example.",
      subject: "reading",
    },
    {
      passage: `${NOTES}\n· The town of Millbrook opened its first public library in 1921.\n· The library began with 300 donated books.\n· Today it holds more than 60,000 books.\n· It also lends tools, seeds and telescopes.`,
      text: "The student wants to emphasize how much the library's collection has grown. Before reading the choices, what should you do first?",
      choices: [
        "Read all the notes and decide which fact is the most interesting.",
        "Mark the goal's verb, emphasize, and the point that follows it.",
        "Look for the choice that uses the most facts from the notes.",
        "Check each choice against the notes to see whether its facts are accurate.",
      ],
      right: 1,
      why: "Start with the goal. Mark the verb emphasize and the point after it, how much the collection has grown. Now you can predict a sentence built on 300 books then and more than 60,000 now. Reading the notes first, the tempting move, pulls you toward True but off goal choices, such as one about tools and telescopes. Choosing the most facts rewards length, not the goal. Checking facts comes last, since nearly every choice is accurate.",
      subject: "reading",
    },
    {
      passage: `${NOTES}\n· The Lin River Bridge crosses the Lin River.\n· It is 400 meters long.\n· Workers finished it in just 9 months.\n· Similar bridges usually take about 2 years to build.`,
      text: "The student wants to emphasize how quickly the bridge was built. Maya chose this sentence: The Lin River Bridge, which was finished in just 9 months, is 400 meters long. Why is her choice not the best answer?",
      choices: [
        "It uses a fact that does not appear in the notes.",
        "It should also say that the bridge crosses the Lin River.",
        "It puts the fast building in a side clause, so its main point is the length.",
        "It gives one example when the goal asks for a generalization.",
      ],
      right: 2,
      why: "The goal says emphasize speed, so speed must be the main point. In Maya's sentence the 9 months sits in a which clause, and the main clause says the bridge is 400 meters long: the **Buried point** trap. A better sentence says workers finished it in 9 months, far faster than the usual 2 years. Every fact she used is in the notes. Naming the river would not help the goal, and the goal asks for emphasis, not a generalization.",
      subject: "reading",
    },
    {
      passage: `${NOTES}\n· Some sea animals make their own light.\n· The anglerfish dangles a glowing lure to attract prey.\n· Some squid glow on their undersides to blend in with light from above.\n· Some deep-sea shrimp spit out glowing clouds to confuse attackers.`,
      text: `The student wants to give one example of a sea animal that uses its light to hunt. ${ASK}`,
      choices: [
        "The anglerfish dangles a glowing lure that draws its prey close.",
        "Some sea animals make their own light, which helps them hunt, hide or escape.",
        "Some squid glow on their undersides, blending in with light from above.",
        "Some deep-sea shrimp spit out glowing clouds to confuse attackers.",
      ],
      right: 0,
      why: "The goal asks for one example, and the example must be about hunting. The anglerfish uses its glowing lure to draw in prey, so that choice fits. The tempting broad sentence about sea animals that hunt, hide or escape is a generalization, not one case: the **Wrong level** trap. The squid uses light to hide, and the shrimp uses it to escape. Both are single examples, but they are the **True but off goal** trap.",
      subject: "reading",
    },
    {
      passage: `${NOTES}\n· The Svalbard Global Seed Vault is in Norway, far north of the Arctic Circle.\n· It stores seeds of crops from around the world.\n· It was dug deep into a frozen mountain.\n· The frozen rock keeps the seeds cold even if the power fails.\n· Stored copies can help farmers replace crops lost to war or disaster.`,
      text: `The student wants to explain why the vault was built inside a frozen mountain. ${ASK}`,
      choices: [
        "The Svalbard Global Seed Vault, far north of the Arctic Circle in Norway, stores seeds of crops from around the world.",
        "Because frozen rock keeps seeds cold even if the power fails, the Svalbard vault was dug deep into a frozen mountain.",
        "The Svalbard vault was dug deep into a frozen mountain, and it stores seeds of crops from around the world.",
        "Seed copies stored in the Svalbard vault can help farmers replace crops lost to war or disaster.",
      ],
      right: 1,
      why: "The goal asks why the vault sits inside a frozen mountain, so the sentence must give a reason for that choice. Only the sentence starting with because frozen rock keeps seeds cold links the reason to the mountain. The tempting choice about replacing lost crops is the **True but off goal** trap: it explains why the vault exists, not why it is in a mountain. The choice joining the mountain and the seeds gives no reason. The location choice never mentions the mountain.",
      subject: "reading",
    },
  ],
};

export default lesson;
