import type { Lesson } from "../types";

const lesson: Lesson = {
  id: "rw-inferring-from-findings",
  tests:
    "Choosing the ending that says what a study's result shows, and no more. The right claim stays inside what was measured, in the group that was studied.",
  spot: "A text describes a study: what researchers did and what they found. It ends in a blank, and the question asks which choice most logically completes the text.",
  idea: [
    "A study supports claims only about **what it measured**, in the group it measured. The right answer stays inside those lines.",
    "Two things happening together is a **link**, not proof that one causes the other. If a second difference could explain the result, the study cannot say which one did it.",
    "One study **suggests**. Choices that say proves, all or always almost never fit.",
  ],
  rules: ["Measured what? In whom? Found what?", "A link is not a cause", "Suggests, not proves"],
  figure: {
    kind: "passage",
    text: "In a survey of 120 parks in one city, parks with more trees had fewer litter complaints. But the parks with more trees also had more trash cans. So the survey shows a link, but not whether the trees or the trash cans made the difference.",
    marks: [
      { find: "120 parks in one city", tone: "blue", note: "Who was studied" },
      { find: "fewer litter complaints", tone: "green", note: "The finding" },
      { find: "more trash cans", tone: "red", note: "A second difference" },
      { find: "shows a link", tone: "gold", note: "The narrow claim" },
    ],
  },
  strategy: {
    name: "Shrink to the finding",
    steps: [
      "Note what was measured, in whom, and what was found.",
      "Ask what the result shows and what it does not.",
      "Predict the narrowest claim the result supports.",
      "Cross out choices that stretch to new groups, turn a link into a cause, or claim proof.",
    ],
  },
  examples: [
    {
      title: "A second difference",
      passage:
        "In a study of 150 students, those who ate breakfast every day scored higher on morning math quizzes. However, the students who ate breakfast also slept about an hour more each night than those who skipped it. Therefore, the study ______",
      problem: "Which choice most logically completes the text?",
      choices: [
        "shows that eating breakfast raises math scores.",
        "proves that sleep has no effect on quiz scores.",
        "cannot by itself show whether breakfast or sleep explains the higher scores.",
        "shows that every student should eat breakfast before school.",
      ],
      right: 2,
      steps: [
        {
          say: "Note the study. Measured: breakfast and quiz scores. Group: 150 students. Found: breakfast eaters scored higher.",
        },
        {
          say: "Ask what it does not show. The breakfast eaters also slept more, so the groups differ in two ways, not one.",
        },
        { say: "Predict: the study cannot tell which difference mattered." },
        {
          say: "Pick the choice that says it cannot show whether breakfast or sleep explains the scores. Breakfast raising scores turns a link into a cause, every student stretches the result, and the study never tested sleep alone.",
        },
      ],
      answer: "cannot by itself show whether breakfast or sleep explains the higher scores.",
    },
    {
      title: "One group",
      passage:
        "Researchers tested a new pain cream on 40 adult mice with sore paws. Mice given the new cream licked their paws far less over the next day than mice given a plain cream. The researchers concluded that the new cream ______",
      problem: "Which choice most logically completes the text?",
      choices: [
        "will ease pain in people as well as it did in mice.",
        "may reduce soreness in mice, at least over a short time.",
        "cures sore paws in all animals.",
        "works better than every other pain cream.",
      ],
      right: 1,
      steps: [
        {
          say: "Note the study. Measured: paw licking for one day. Group: 40 adult mice. Found: cream mice licked far less.",
        },
        {
          say: "Ask what it does not show: only mice, only one day, compared only with a plain cream.",
        },
        { say: "Predict: the cream may ease soreness in mice over a short time." },
        {
          say: "Pick that choice. People and all animals stretch to new groups, and better than every other cream ignores that it was tested only against a plain cream.",
        },
      ],
      answer: "may reduce soreness in mice, at least over a short time.",
      tryFrom: 2,
    },
  ],
  traps: [
    {
      name: "Cause from a link",
      text: "Two things go together, so the choice says one causes the other. Look for a second difference between the groups that could explain the result.",
    },
    {
      name: "Overreach",
      text: "The choice stretches from some to all, from mice to people, or from one city to everywhere. Circle the group in the text and hold every choice to it.",
    },
    {
      name: "Missed limit",
      text: "The choice ignores a small word such as only, in mice, for one week or compared with a plain cream. Those words fence in what the study can claim.",
    },
  ],
  tip: {
    kind: "reading",
    title: "Circle who and what",
    steps: [
      "Circle who was studied: 40 mice, 150 students, parks in one city.",
      "Underline what was measured, and for how long.",
      "For each choice, ask: does it stay inside that group and that measure?",
    ],
  },
  check: {
    passage:
      "A survey of 500 adults in one city found that people who owned dogs walked more each day than people who did not. The survey did not track whether people walked more after getting a dog or got a dog because they already liked to walk. So the survey ______",
    text: "Which choice most logically completes the text?",
    choices: [
      "shows a link between owning a dog and walking, but not which one leads to the other.",
      "shows that owning a dog makes people walk more.",
      "proves that people in every city walk more if they own dogs.",
      "shows that people who walk a lot do not want dogs.",
    ],
    right: 0,
    why: "The survey found that dog owners walked more, but it did not track which came first. So it shows a link and nothing more. Owning a dog making people walk more is cause from a link, the exact question the survey left open. Every city is overreach from one city, and proves is too strong for one survey. People who walk a lot not wanting dogs is the opposite of the finding.",
  },
  quiz: [
    {
      passage:
        "Researchers fed 30 young honeybees sugar water mixed with a plant extract for two weeks. In a maze test, these bees found the food station faster than bees fed plain sugar water. The researchers concluded that the extract ______",
      text: "Which choice most logically completes the text?",
      choices: [
        "improves memory in all insects.",
        "will help people learn new tasks faster.",
        "works better than any other food for bees.",
        "may help young honeybees find food in a maze.",
      ],
      right: 3,
      why: "Shrink the claim to the finding. Measured: time to find food in a maze. Group: 30 young honeybees. Found: the extract bees were faster. So the extract may help young honeybees find food in a maze. All insects and people are overreach, since the study tested neither. Better than any other bee food is a missed limit: the extract was compared only with plain sugar water.",
      subject: "reading",
    },
    {
      passage:
        "In a study of 80 office workers, those who sat near windows reported fewer headaches than those who sat in the middle of the room. The workers near windows also had newer computer screens. Therefore, the study ______",
      text: "Before you look at the choices, what should you do first?",
      choices: [
        "Note what was measured, in whom, and any second difference between the groups.",
        "Decide whether sunlight is good for health, based on what you already know.",
        "Pick the choice that explains why windows prevent headaches.",
        "Find the choice that covers the most people.",
      ],
      right: 0,
      why: "Start with the study itself: 80 office workers, headaches measured, window seats reported fewer. Then spot the second difference, the newer screens. That limit tells you the study cannot say which one helped. Explaining why windows prevent headaches assumes a cause from a link. Using what you know about sunlight brings in outside facts the text does not give. Hunting for the widest choice leads straight to overreach.",
      subject: "reading",
    },
    {
      passage:
        "A study followed 1,000 teenagers in one state for a year. Teens who played a musical instrument had higher grades, on average, than teens who did not. The study did not look at how much time each teen spent on homework.",
      text: "A student concludes that playing an instrument raised these teens' grades. Which trap did the student fall into?",
      choices: [
        "Overreach: the claim covers teens the study never looked at.",
        "Missed limit: the claim stretches past the one year of the study.",
        "Cause from a link: the study found only that music and grades went together.",
        "Opposite: the teens with instruments actually had lower grades.",
      ],
      right: 2,
      why: "The study found that players had higher grades, which is a link. The student says playing raised the grades, which is a cause. That is cause from a link: homework time, or something else, could explain both. Overreach does not fit, because the claim stays with these teens. The one-year length is a real limit, but the claim does not stretch past it. And it is not the opposite, since players did have higher grades.",
      subject: "reading",
    },
    {
      text: "Which task asks you to keep a conclusion inside the limits of the research?",
      choices: [
        "A text names three causes and rules out two; you pick the ending that names the one left.",
        "A text reports what a study measured and found; you pick the ending that says what it means.",
        "A text states a claim; you pick the finding that would most strongly support it.",
        "A table lists results; you pick the choice that uses its data to finish an example.",
      ],
      right: 1,
      why: "When a text reports a study and ends in a blank about what the result means, you shrink the claim to what was measured, in whom. Ruling out two of three causes is a logic chain with no study limits to check. Picking a finding that would support a claim runs the other way: you choose the evidence, not the conclusion. Using a table's data to finish an example is a data question.",
      subject: "reading",
    },
    {
      passage:
        "Ecologists counted songbirds in 24 forest patches in one region. Patches that had been logged within the past ten years held about half as many nesting pairs as patches left alone. Yet the logged patches were also, on average, much closer to busy roads, and road noise is known to drive some songbirds away. The ecologists concluded that their survey ______",
      text: "Which choice most logically completes the text?",
      choices: [
        "shows that logging cuts songbird numbers in half in forests everywhere.",
        "proves that road noise, not logging, explains why fewer songbirds nest there.",
        "shows that songbirds prefer forest patches close to busy roads.",
        "cannot on its own show how much of the drop is due to logging rather than road noise.",
      ],
      right: 3,
      why: "Shrink to the finding. Logged patches had fewer nesting pairs, but they were also near noisy roads. Two differences and one result, so the survey cannot separate them. Logging cutting numbers in forests everywhere is overreach and cause from a link at once. Proving road noise is the cause makes the same cause from a link mistake in the other direction. Songbirds preferring busy roads is the opposite of the counts.",
      subject: "reading",
    },
  ],
};

export default lesson;
