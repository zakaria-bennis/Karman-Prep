import type { Lesson } from "../types";

const ASK = "Which choice completes the text with the most logical transition?";

const lesson: Lesson = {
  id: "rw-transitions-adding-on",
  tests:
    "Choosing the transition that shows the next sentence goes the same way as the one before: it adds a point, names a similar case, gives an example, or says the same idea again.",
  spot: "A blank at the start of a sentence, a question about the most logical transition, and choices such as Moreover, Similarly, For example and In other words.",
  idea: [
    "Some transitions say the idea goes the **same way**. But adding-on words are not all alike, so first decide how the second sentence goes on.",
    "Ask which kind of link it is: a new point on the same side, a similar case, an example of the first idea, or the same idea in new words.",
    "**For example** needs one case of the idea before it. **In other words** needs the same idea again. **Similarly** needs two separate things that match.",
  ],
  rules: [
    "New point: moreover, in addition, furthermore",
    "Similar case: similarly, likewise",
    "Example: for example, for instance",
    "Same idea: in other words, that is",
  ],
  figure: {
    kind: "road",
    turn: "add",
    before: "Sea otters use rocks to crack open clams.",
    after: "they wrap themselves in kelp so they do not drift away while they sleep.",
    word: "In addition,",
  },
  strategy: {
    name: "Name the same-way link",
    steps: [
      "Cover the choices and read both sentences.",
      "Check that the second sentence goes the same way as the first.",
      "Ask which kind: new point, similar case, example, or same idea again.",
      "Pick the word for that kind, and cross off pairs that mean the same thing.",
    ],
  },
  examples: [
    {
      title: "An example",
      passage:
        "Many everyday products began as space research. ______ the memory foam in some mattresses was first developed to make airplane seats safer in crashes for NASA.",
      problem: ASK,
      choices: ["In other words,", "For instance,", "Similarly,", "However,"],
      right: 1,
      steps: [
        { say: "The first sentence: many products began as space research." },
        { say: "The second sentence: memory foam began with NASA work. It goes the same way." },
        { say: "Memory foam is one case of the first idea, so the link is an **example**." },
        {
          say: "For instance fits. In other words would repeat the idea, Similarly needs a separate matching case, and However turns.",
        },
      ],
      answer: "For instance,",
    },
    {
      title: "Same idea again",
      passage:
        "The coach told the team that the game would be won or lost on defense. ______ stopping the other team from scoring would matter more than scoring goals themselves.",
      problem: ASK,
      choices: ["For example,", "Likewise,", "In other words,", "Nevertheless,"],
      right: 2,
      steps: [
        { say: "The first sentence: the game depends on defense." },
        { say: "The second sentence: stopping the other team matters most. It goes the same way." },
        {
          say: "It says the first idea again in plainer words, so the link is the **same idea**.",
        },
        {
          say: "In other words fits. For example needs one specific case, Likewise needs a second matching thing, and Nevertheless turns.",
        },
      ],
      answer: "In other words,",
      tryFrom: 2,
    },
  ],
  traps: [
    {
      name: "Example or restatement",
      text: "For example needs one specific case of the idea. In other words needs the same idea said again. Ask: is the second sentence one case, or the whole idea in new words?",
    },
    {
      name: "Similar without a match",
      text: "Similarly and likewise need two separate things that do the same thing. If the second sentence just adds another point about the same subject, use in addition or moreover.",
    },
    {
      name: "Synonym pair",
      text: "When two choices mean the same thing, such as Moreover and Furthermore, they cannot both be the one right answer, so both are almost always wrong.",
    },
  ],
  tip: {
    kind: "reading",
    title: "Test with plain words",
    steps: [
      "Say a plain word between the two sentences: also, like that, for example, or that is.",
      "Also means a new point. Like that means a similar case.",
      "For example means one case of the idea. That is means the same idea again.",
      "Pick the choice that means the plain word that fit.",
    ],
  },
  check: {
    passage:
      "Bamboo is one of the fastest-growing plants on Earth. ______ it is strong enough that builders in parts of Asia use it for scaffolding on tall buildings.",
    text: ASK,
    choices: ["Moreover,", "For instance,", "In other words,", "Likewise,"],
    right: 0,
    why: "Both sentences praise bamboo, so the idea goes the same way, and the second adds a new point: strength on top of speed. Moreover fits. For instance would make the strength one case of fast growth, which it is not. In other words would mean strength is the same idea as speed. Likewise needs a second, separate thing that matches bamboo: the **Similar without a match** trap.",
  },
  quiz: [
    {
      passage:
        "The new phone's battery lasts about two days on a single charge. ______ most people will need to plug it in only every other day.",
      text: ASK,
      choices: ["Similarly,", "For example,", "In addition,", "That is,"],
      right: 3,
      why: "Two days on one charge and plugging in every other day are the same fact in new words, so the link is the same idea again. That is fits. For example would make the second sentence one case of the first, the **Example or restatement** trap. In addition treats it as a new point, but it adds nothing new. Similarly needs a second, separate thing that matches the battery.",
      subject: "reading",
    },
    {
      passage:
        "Owls can turn their heads much farther than people can, which helps them spot prey without moving their bodies. ______ their feathers have soft, fringed edges that let them fly almost silently.",
      text: "Before you look at the choices, what should you do first?",
      choices: [
        "Read only the sentence with the blank and pick the word that sounds smoothest.",
        "Read both sentences and decide whether the second goes the same way as the first.",
        "Pick the most formal choice, such as Furthermore, since formal words sound right.",
        "Cross off any choice that has a twin with the same meaning.",
      ],
      right: 1,
      why: "Start by reading both sentences and naming the link: here, a second owl skill, so the idea goes the same way with a new point. The tempting move, reading only the sentence with the blank, misses the first half of the link. Picking the most formal word ignores meaning. Crossing off a Synonym pair is a real move, but it comes last, after you know what kind of link you need.",
      subject: "reading",
    },
    {
      passage:
        "The new library downtown has a rooftop garden where visitors can sit and read outdoors on warm days. ______ it offers free evening classes in coding and photography for adults.",
      text: "Jon filled the blank with Similarly. Why is his choice wrong?",
      choices: [
        "The classes are a new point about the library, not a second thing that matches the garden, so In addition fits.",
        "The classes are a case of the garden, so For example fits.",
        "The classes say the same thing as the garden, so In other words fits.",
        "The classes go against the garden, so However fits.",
      ],
      right: 0,
      why: "Both sentences list good things about one library, so the second simply adds a point, and In addition fits. Jon fell for Similar without a match: similarly needs two separate things that do the same thing, such as two libraries with gardens. The classes are not one case of the garden, so For example fails. They are a different idea, not the same one restated. Nothing in the sentences turns, so However fails.",
      subject: "reading",
    },
    {
      passage:
        "Many desert animals are active only at night, when the air is cooler. ______ the fennec fox sleeps in a burrow during the day and hunts after dark.",
      text: ASK,
      choices: ["In other words,", "Likewise,", "For example,", "Moreover,"],
      right: 2,
      why: "The first sentence makes a claim about many desert animals, and the fennec fox is one of them, so the link is an example: For example fits. The tempting In other words would mean the second sentence repeats the whole idea, but it names just one animal: the **Example or restatement** trap. Likewise needs a separate matching case, not a member of the same group. Moreover would add a new point instead of showing one case.",
      subject: "reading",
    },
    {
      passage:
        "Honeybees perform a waggle dance to tell other bees where to find flowers: the angle of the dance shows the direction, and how long it lasts shows the distance. ______ some ant species lay scent trails that lead their nestmates from the colony to food.",
      text: ASK,
      choices: ["For instance,", "Similarly,", "In other words,", "As a result,"],
      right: 1,
      why: "Bees and ants are two separate insects that each guide nestmates to food, so the second sentence gives a matching case: Similarly fits. The tempting For instance would make the ants one case of the honeybee dance, but the first sentence is only about honeybees: the **Example or restatement** trap. In other words would mean scent trails are the same thing as the dance. As a result claims the dance caused the ant trails.",
      subject: "reading",
    },
  ],
};

export default lesson;
