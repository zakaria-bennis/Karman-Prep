import type { Lesson } from "../types";

const lesson: Lesson = {
  id: "rw-advanced-vocabulary",
  tests:
    "Choosing the right less common word for a blank, from the context and what you know about word meanings. You do not need to know every choice.",
  spot: "A blank in the text and a question asking for the most logical and precise word, but the choices are harder words, such as tenuous, candid or lucid.",
  idea: [
    "Start the usual way: predict a **plain word** for the blank from the clue in the text.",
    "Then decide the **charge**. Does the blank need a positive or a negative word, a strong one or a mild one? That alone often cuts two choices.",
    "Cross out every choice you know is wrong. If the word left is one you don't know, it can still be right: **elimination** is enough.",
  ],
  rules: ["Predict a plain word", "Positive or negative?", "Unknown is not wrong"],
  figure: {
    kind: "words",
    sentence:
      "The new manager was famously ______: she rarely spoke in meetings and answered most questions in a word or two.",
    words: [
      { word: "reticent", fit: true, note: "Says little" },
      { word: "garrulous", fit: false, note: "Talks a lot: the opposite" },
      { word: "eloquent", fit: false, note: "Speaks well: fancy-word pull" },
      { word: "hostile", fit: false, note: "Wrong charge" },
    ],
  },
  strategy: {
    name: "Charge, then cross out",
    steps: [
      "Predict a plain word from the clue.",
      "Decide the charge: positive or negative, strong or mild.",
      "Cross out the choices you know don't fit.",
      "Keep what is left, even a word you don't know.",
    ],
  },
  examples: [
    {
      title: "Positive charge",
      passage:
        "Most of the scientist's early experiments failed, and colleagues urged her to give up. She refused, repeating the work for six more years until it finally succeeded. Her friends admired her ______.",
      problem: "Which choice completes the text with the most logical and precise word or phrase?",
      choices: ["tenacity", "obstinacy", "apathy", "erudition"],
      right: 0,
      steps: [
        {
          say: "Predict a plain word. She kept going for six more years, so the blank means sticking with it.",
        },
        { say: "Decide the charge. Her friends admired it, so the word is positive." },
        {
          say: "Cross out apathy, which means not caring, and obstinacy, which means stubbornness, an insult. Erudition means deep learning, the wrong idea.",
        },
        { say: "Tenacity, refusing to give up, is left, and it matches the prediction." },
      ],
      answer: "tenacity",
      checkIn: {
        text: "Which choice completes the text with the most logical and precise word or phrase?",
        passage:
          "Even when the bridge project faced storms, delays and budget cuts, the chief engineer never lost hope and kept the crews working. The town later honored her for her ______.",
        choices: ["obstinacy", "perseverance", "indifference", "frivolity"],
        right: 1,
        why: "She kept going through storms and budget cuts, and the town honored her, so the word must be positive and mean not giving up: perseverance. Obstinacy also means not giving up, but it is negative (stubbornness), the **Wrong charge** trap.",
        twin: {
          text: "Which choice completes the text with the most logical and precise word or phrase?",
          passage:
            "For thirty years, the librarian answered every question with care and never turned a reader away. Visitors often thanked her for her ______.",
          choices: ["dedication", "officiousness", "lethargy", "audacity"],
          right: 0,
          why: "Thirty years of careful help, never turning a reader away, earns thanks, so the word is positive: dedication. Officiousness sounds similar but means being pushy and meddling, the **Wrong charge** trap.",
        },
      },
    },
    {
      title: "Negative charge",
      passage:
        "The museum's claim that the vase was 3,000 years old rested on one faded label of unknown origin. Most experts therefore considered the claim ______.",
      problem: "Which choice completes the text with the most logical and precise word or phrase?",
      choices: ["irrefutable", "dubious", "venerable", "meticulous"],
      right: 1,
      steps: [
        {
          say: "Predict a plain word. One faded label of unknown origin is weak support, so the word is doubtful.",
        },
        { say: "Decide the charge: negative." },
        {
          say: "Cross out irrefutable, which is positive, and meticulous, which means careful. Venerable means old and respected: it fits the vase, not the claim.",
        },
        { say: "Dubious, meaning doubtful, is left, and it matches." },
      ],
      answer: "dubious",
      tryFrom: 2,
      checkIn: {
        text: "Which choice completes the text with the most logical and precise word or phrase?",
        passage:
          "The company said its new drink could cure colds, but it offered no studies or test results to back up the claim. Doctors called the promise ______.",
        choices: ["persuasive", "authoritative", "unfounded", "scrupulous"],
        right: 2,
        why: "With no studies or test results behind it, the promise has no support, so the word must be negative: unfounded. Persuasive and authoritative praise the claim, the **Wrong charge** trap.",
        twin: {
          text: "Which choice completes the text with the most logical and precise word or phrase?",
          passage:
            "The witness said she saw the thief clearly, but it was midnight, the street had no lights, and she was standing a block away. The detective found her account ______.",
          choices: ["credible", "implausible", "eloquent", "meticulous"],
          right: 1,
          why: "Midnight, no streetlights and a block away all make a clear view unlikely, so the word must be negative: implausible. Credible says the opposite, the **Wrong charge** trap.",
        },
      },
    },
  ],
  traps: [
    {
      name: "Fancy-word pull",
      text: "Picking the hardest word because it sounds smart. A hard word is right only when its meaning fits the clue.",
    },
    {
      name: "Wrong feeling",
      text: "A near synonym with the wrong tone, such as stingy, an insult, where the text praises someone for being frugal. Check how the text feels about the subject.",
    },
    {
      name: "Wrong charge",
      text: "A positive word where the text is critical, or a negative word where it praises. Decide the charge before you read the choices.",
    },
  ],
  tip: {
    kind: "reading",
    title: "Use word parts",
    steps: [
      "Look for a part you know: bene means good, mal means bad, cred means believe.",
      "A part can show the charge of a word you don't know: malicious is negative, benevolent is positive.",
      "Use parts to cross out, not to choose. The clue in the text still decides.",
    ],
  },
  check: {
    passage:
      "The guidebook warned that the mountain road is ______ in winter: ice and fog make every curve a hazard, and several cars slide off it each year.",
    text: "Which choice completes the text with the most logical and precise word or phrase?",
    choices: ["picturesque", "serene", "treacherous", "ostentatious"],
    right: 2,
    why: "Predict: ice, fog and sliding cars mean the road is dangerous, a negative word. Treacherous means full of hidden danger, so it matches. Serene, meaning calm and peaceful, has the wrong charge. Picturesque means pretty to look at; it fits mountain roads but not the warning. Ostentatious means showy, a fancy-word pull that cannot describe a road's danger.",
  },
  quiz: [
    {
      passage:
        "The company's claim that its drink improves memory was based on a survey of just eight customers, all of them its own employees. Scientists called the evidence for the claim ______.",
      text: "Which choice completes the text with the most logical and precise word or phrase?",
      choices: ["compelling", "pristine", "lucid", "tenuous"],
      right: 3,
      why: "Predict a plain word: eight customers who all work for the company is weak support, so the word means thin, a negative word. Tenuous means weak or flimsy, so it matches. Compelling has the wrong charge: it means convincing. Lucid means clear, also positive and the wrong idea. Pristine, meaning spotless, is a fancy-word pull that says nothing about weak evidence.",
      subject: "reading",
    },
    {
      passage:
        "Critics had expected the young pianist to play cautiously at her first major concert. Instead, she attacked the hardest pieces with ______, taking risks that delighted the crowd.",
      text: "You don't know two of the four choices. What should you do first?",
      choices: [
        "Predict a plain word, such as boldness, and note that the blank needs a positive word.",
        "Pick a word you don't know, since hard questions usually have hard answers.",
        "Pick the word that means caution, since the critics expected caution.",
        "Skip the question, because you cannot answer without knowing every word.",
      ],
      right: 0,
      why: "Predict first. Instead flips the critics' guess, and risks that delighted the crowd point to boldness, a positive word. With that in hand, you can cross out the words you know don't fit, even if two are unfamiliar. Picking an unknown word because it sounds hard is the fancy-word pull. A word for caution matches the critics' guess, not what happened. And you never need every word, only enough to cross out.",
      subject: "reading",
    },
    {
      passage:
        "Grandpa Leo saves rubber bands, reuses wrapping paper and patches his old coat instead of buying a new one. His family admires how ______ he is, and they credit his habits with the savings that paid for their house.",
      text: "A student filled the blank with stingy. Why is that choice wrong?",
      choices: [
        "It has the wrong charge: stingy is a positive word, and the text is critical.",
        "It is a fancy-word pull: stingy is too hard a word for this text.",
        "It has the wrong feeling: stingy is an insult, but the family admires him, so a word like frugal fits.",
        "It is not wrong: saving rubber bands is a stingy habit.",
      ],
      right: 2,
      why: "Saving money is the right idea, but the feeling is wrong. The family admires him and credits his habits with paying for the house, so the blank needs praise: frugal, careful with money. Stingy means unwilling to spend or share, an insult, which is the wrong feeling trap. Stingy is negative, not positive, and it is a common word, not a fancy one. Whether saving rubber bands seems stingy to you is outside the text.",
      subject: "reading",
    },
    {
      text: "Which question is best handled by deciding the charge and crossing out the hard words you know are wrong?",
      choices: [
        "It asks what the word run most nearly means as it is used in the text.",
        "It asks for the most logical and precise word, and the choices are tenuous, lucid, candid and opulent.",
        "It asks for the most logical transition, and the choices are however, thus, also and still.",
        "It asks for the most logical and precise word, and the choices are fast, late, early and slow.",
      ],
      right: 1,
      why: "Charge and cross out pays off when the choices are less common words, such as tenuous, lucid, candid and opulent: you may not know them all, so you sort them by charge and meaning. With everyday words like fast and slow, you know every choice, so you simply match your prediction. A meaning question asks about a common word already in the text. A transition question asks how two ideas link.",
      subject: "reading",
    },
    {
      passage:
        "In her letters, the explorer described the frozen coast in plain, careful terms, noting the temperature each morning and the number of seals she counted. Readers hoping for thrilling tales of danger were often disappointed. Yet historians now value the letters precisely because they are so ______: their dull precision makes them some of the most reliable records of the region from that time.",
      text: "Which choice completes the text with the most logical and precise word or phrase?",
      choices: ["prosaic", "sensational", "erratic", "grandiose"],
      right: 0,
      why: "Predict a plain word: the letters are plain and careful, and the colon calls their precision dull, so the word means matter-of-fact. Prosaic means plain and unexciting, so it matches, even though the text treats that plainness as a strength. Sensational fits the thrilling tales readers wanted, not the letters, so it is the wrong charge for this blank. Erratic, meaning unpredictable, clashes with careful notes. Grandiose sounds impressive, a fancy-word pull, but means showy and grand.",
      subject: "reading",
    },
  ],
};

export default lesson;
