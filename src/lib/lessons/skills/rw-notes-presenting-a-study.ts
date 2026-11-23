import type { Lesson } from "../types";

const ASK =
  "Which choice most effectively uses relevant information from the notes to accomplish this goal?";
const INTRO = "While researching a topic, a student has taken the following notes:";

const lesson: Lesson = {
  id: "rw-notes-presenting-a-study",
  tests:
    "Choosing the sentence that uses a student's notes to introduce a study: its aim, its method or its findings.",
  spot: "Notes about a piece of research, then a goal such as present the study and its findings, emphasize the aim, or introduce the research to an unfamiliar audience.",
  idea: [
    "The goal names the part of the study you need. **Findings** means what the study showed. **Aim** means what the researchers wanted to learn. **Method** means how they did it.",
    "Turn the goal into a short checklist, then cross out any choice that misses an item. Most wrong choices are true but give the wrong part, or only part of what the goal asks.",
    "If the goal names an audience that does not know the work, the sentence must say **who or what** something is: chemist Ana Ruiz, not just Ruiz.",
  ],
  rules: [
    "Findings = what it showed",
    "Aim = what they wanted to learn",
    "Method = how they did it",
  ],
  figure: {
    kind: "notes",
    goal: "Present the study's main finding.",
    notes: [
      "Marine biologist Lena Okafor studied kelp forests in 2023.",
      "Her team counted sea urchins at 30 sites.",
      "Sites with sea otters had about one tenth as many urchins as sites without otters.",
      "Sea urchins eat kelp.",
    ],
    pick: [0, 2],
  },
  strategy: {
    name: "Goal to checklist",
    steps: [
      "Turn the goal into a checklist: the study, its aim, its method, its result, the researcher.",
      "Cross out any choice that misses an item on the list.",
      "If the goal names an audience, check that the researcher or topic is introduced.",
      "Use the notes only to confirm.",
    ],
  },
  examples: [
    {
      title: "The findings",
      passage: `${INTRO}\n• In 2022, psychologist Mara Lindqvist studied how music affects focus.\n• Her team gave 120 students a reading test.\n• Half the students heard quiet music; half worked in silence.\n• Scores were about the same in both groups.`,
      problem: `The student wants to present the study's findings. ${ASK}`,
      choices: [
        "In 2022, psychologist Mara Lindqvist studied how music affects focus.",
        "Lindqvist's team gave 120 students a reading test, with half hearing quiet music and half working in silence.",
        "Many students listen to music while they study.",
        "In a 2022 study of 120 students, Mara Lindqvist found that reading test scores were about the same with quiet music as in silence.",
      ],
      right: 3,
      steps: [
        { say: "Turn the goal into a checklist: the study and its **findings**, what it showed." },
        { say: "The first choice names the study and its topic but no result: partial." },
        {
          say: "The second choice gives the method, how the test was run, not what it found: the wrong part. The third is not in the notes.",
        },
        {
          say: "Only the last choice names the study and says what it found: scores were about the same.",
        },
      ],
      answer:
        "In a 2022 study of 120 students, Mara Lindqvist found that reading test scores were about the same with quiet music as in silence.",
      checkIn: {
        text: "The student wants to present the study's findings. Which choice most effectively uses relevant information from the notes to accomplish this goal?",
        passage:
          "While researching a topic, a student has taken the following notes:\n• In 2020, biologist Tomas Ferro studied how noise affects songbirds.\n• His team recorded robins in quiet parks and next to busy roads.\n• Robins near roads sang at a higher pitch.\n• Higher notes are easier to hear over low traffic noise.",
        choices: [
          "In 2020, biologist Tomas Ferro studied how noise affects songbirds.",
          "Ferro's team recorded robins in quiet parks and next to busy roads.",
          "In a 2020 study, Tomas Ferro found that robins living next to busy roads sang at a higher pitch than robins in quiet parks.",
          "Higher notes are easier to hear over low traffic noise.",
        ],
        right: 2,
        why: "Findings are what the study found: robins near roads sang higher. The first choice gives the aim and the second the method, the **Wrong part** trap, and the last is background.",
        twin: {
          text: "The student wants to present the study's findings. Which choice most effectively uses relevant information from the notes to accomplish this goal?",
          passage:
            "While researching a topic, a student has taken the following notes:\n• In 2019, nutrition scientist Asha Rao studied snacks and attention.\n• She gave 80 students either an apple or a candy bar before class.\n• She then timed how long each student stayed on task.\n• Students who ate apples stayed on task about ten minutes longer.",
          choices: [
            "Rao gave 80 students either an apple or a candy bar before class.",
            "In a 2019 study of 80 students, Asha Rao found that students who ate apples stayed on task about ten minutes longer than those who ate candy bars.",
            "In 2019, nutrition scientist Asha Rao studied snacks and attention.",
            "Many students eat snacks before class.",
          ],
          right: 1,
          why: "Only the second choice gives the result: apple eaters stayed on task longer. The first gives the method and the third the aim, the **Wrong part** trap.",
        },
      },
    },
    {
      title: "A new audience",
      passage: `${INTRO}\n• Ji-woo Han is an archaeologist.\n• Han studies ancient fishing tools.\n• In 2021, she tested copies of 3,000-year-old bone hooks.\n• The copies caught as many fish as modern steel hooks.`,
      problem: `The student wants to introduce Han's research to an audience unfamiliar with Han. ${ASK}`,
      choices: [
        "Han found that the copies caught as many fish as modern steel hooks.",
        "Archaeologist Ji-woo Han studies ancient fishing tools, such as 3,000-year-old bone hooks.",
        "Some bone hooks are 3,000 years old.",
        "In 2021, Han tested copies of the hooks.",
      ],
      right: 1,
      steps: [
        {
          say: "Turn the goal into a checklist: a new audience needs **who Han is** and **what she studies**.",
        },
        {
          say: "Cross out the choices that just say Han, with no word on who she is: missing context.",
        },
        { say: "The choice about the hooks' age names no researcher and no research: partial." },
        { say: "Only the choice that begins Archaeologist Ji-woo Han ticks both boxes." },
      ],
      answer:
        "Archaeologist Ji-woo Han studies ancient fishing tools, such as 3,000-year-old bone hooks.",
      tryFrom: 2,
      checkIn: {
        text: "The student wants to introduce Moreno's research to an audience unfamiliar with Moreno. Which choice most effectively uses relevant information from the notes to accomplish this goal?",
        passage:
          "While researching a topic, a student has taken the following notes:\n• Lucia Moreno is a marine biologist.\n• Moreno studies how octopuses solve problems.\n• In 2022, she gave octopuses jars with crabs sealed inside.\n• Most octopuses learned to twist the lids open.",
        choices: [
          "Moreno found that most octopuses learned to twist the lids open.",
          "In 2022, Moreno gave octopuses jars with crabs inside.",
          "Marine biologist Lucia Moreno studies how octopuses solve problems, such as opening sealed jars.",
          "Octopuses live in oceans around the world.",
        ],
        right: 2,
        why: "A new audience needs to know who Moreno is and what she studies, and only the third choice says both. The first two use her last name alone with no introduction, the **Missing context** trap.",
        twin: {
          text: "The student wants to introduce Mensah's research to an audience unfamiliar with Mensah. Which choice most effectively uses relevant information from the notes to accomplish this goal?",
          passage:
            "While researching a topic, a student has taken the following notes:\n• Kofi Mensah is an astronomer.\n• Mensah studies planets around other stars.\n• In 2023, he measured the light from a distant star.\n• He found signs of a planet about the size of Earth.",
          choices: [
            "Astronomer Kofi Mensah studies planets around other stars, such as one about the size of Earth.",
            "Mensah found signs of a planet about the size of Earth.",
            "In 2023, Mensah measured the light from a distant star.",
            "Some stars are very far from Earth.",
          ],
          right: 0,
          why: "Readers who do not know Mensah need his full name, his field and his topic, and only the first choice gives all three. The others jump to a result or a method with no introduction, the **Missing context** trap.",
        },
      },
    },
  ],
  traps: [
    {
      name: "Wrong part",
      text: "The choice gives the method when the goal asks for the findings, or the reverse. Match the goal's word to the part of the study.",
    },
    {
      name: "Partial",
      text: "The choice names the study but leaves out something the goal asks for, most often the result.",
    },
    {
      name: "Missing context",
      text: "The choice skips the background a new audience needs, such as who the researcher is or what the study was about.",
    },
  ],
  tip: {
    kind: "reading",
    title: "Match the goal's words",
    steps: [
      "Findings: look for found, showed or suggests, followed by a result.",
      "Aim: look for wanted to learn, set out to or sought to.",
      "Method: look for measured, tracked, tested or counted.",
    ],
  },
  check: {
    passage: `${INTRO}\n• Botanist Rafael Ortiz wanted to learn whether traffic noise affects how often bees visit flowers.\n• He placed potted sunflowers beside a busy road and in a quiet park.\n• Bees visited the park flowers about twice as often.`,
    text: `The student wants to emphasize the aim of the research. ${ASK}`,
    choices: [
      "Botanist Rafael Ortiz set out to learn whether traffic noise affects how often bees visit flowers.",
      "Ortiz placed potted sunflowers beside a busy road and in a quiet park.",
      "Bees visited sunflowers in the park about twice as often as those beside the road.",
      "Sunflowers are popular with many kinds of bees.",
    ],
    right: 0,
    why: "The aim is what the researcher wanted to learn, and only the set out to learn choice says it. Placing sunflowers by a road and in a park is the method, and twice as often is the finding: both are the wrong part. Sunflowers being popular with bees is not in the notes and says nothing about the study.",
  },
  quiz: [
    {
      passage: `${INTRO}\n• Kofi Mensah is an engineer.\n• Mensah designs low-cost water filters.\n• His filters use sand and crushed charcoal.\n• In a 2024 test, one filter cleaned 20 liters of water an hour.`,
      text: `The student wants to introduce Mensah and his work to an audience unfamiliar with him. ${ASK}`,
      choices: [
        "Mensah's filters use sand and crushed charcoal.",
        "In a 2024 test, one filter cleaned 20 liters of water an hour.",
        "Mensah tested one of his filters in 2024.",
        "Engineer Kofi Mensah designs low-cost water filters made from sand and crushed charcoal.",
      ],
      right: 3,
      why: "The checklist for a new audience: who Mensah is and what his work is. Only the choice that starts Engineer Kofi Mensah gives both. Mensah's filters and Mensah tested both use his name without saying who he is, which is the **Missing context** trap. The 20 liters choice names no one and no project, so it is the **Partial** trap.",
      subject: "reading",
    },
    {
      passage: `${INTRO}\n• Ecologist Priya Nair studied how wildfires affect songbirds.\n• Her team placed 50 sound recorders in burned and unburned forest.\n• The recorders captured bird songs every morning for a year.\n• Burned areas had fewer songs in the first spring but had recovered by fall.`,
      text: "The student wants to describe the study's method. What should the student do first?",
      choices: [
        "Read the notes and find the most surprising result",
        "Turn the goal into a checklist item: how the study was done",
        "Pick the choice that introduces Nair most fully",
        "Choose the choice that uses the most notes",
      ],
      right: 1,
      why: "Goal to checklist: method means how the study was done, so the right sentence will mention the 50 recorders and the morning songs. Hunting for the most surprising result leads to the findings, the Wrong part. The goal names no new audience, so a full introduction is not the point. Using the most notes can bury the method or skip it.",
      subject: "reading",
    },
    {
      passage: `${INTRO}\n• In 2023, nutrition scientist Nora Feld studied breakfast and attention.\n• Her team tracked 200 students for one school term.\n• Students who ate breakfast scored higher on morning attention tests.`,
      text: "The student wants to present the study's findings. A student chose this sentence: In 2023, nutrition scientist Nora Feld tracked 200 students for one school term. Why is this choice wrong?",
      choices: [
        "It gives the study's method, but the goal asks for its findings.",
        "It never names the scientist who led the study.",
        "It uses a fact that is not in the notes.",
        "It states the finding but leaves out the year.",
      ],
      right: 0,
      why: "The sentence says how the study was done, tracking 200 students, but never what it found, so it is the Wrong part. A right answer would say students who ate breakfast scored higher. It does name Nora Feld. Every fact in it comes from the notes. It includes the year and gives no finding at all.",
      subject: "reading",
    },
    {
      passage: `${INTRO}\n• Geologist Elena Brandt studied a mountain glacier from 2019 to 2023.\n• She wanted to find out how fast the glacier's front edge was moving back.\n• She measured the edge with GPS every summer.\n• The edge moved back about 40 meters a year.`,
      text: `The student wants to emphasize the aim of Brandt's study. ${ASK}`,
      choices: [
        "Brandt found that the glacier's front edge moved back about 40 meters a year.",
        "Brandt measured the glacier's front edge with GPS every summer.",
        "Geologist Elena Brandt set out to learn how fast a glacier's front edge was moving back.",
        "Glaciers are large, slow-moving masses of ice.",
      ],
      right: 2,
      why: "The aim is what Brandt wanted to learn, so the right choice says set out to learn how fast the edge was moving back. The look-alike is the 40 meters choice: it would fit a findings goal, but here it is the Wrong part. Measuring with GPS is the method, also the Wrong part. The last choice is not in the notes.",
      subject: "reading",
    },
    {
      passage: `${INTRO}\n• Dana Whitlock is an animal behavior researcher who studies crows.\n• In 2024, she placed puzzle boxes holding food in 12 city parks.\n• Each box could be opened only by pulling a string.\n• Within two weeks, crows in 9 of the 12 parks had learned to open the boxes.`,
      text: `The student wants to present the study and its findings to an audience unfamiliar with Whitlock. ${ASK}`,
      choices: [
        "Whitlock found that crows in 9 of the 12 parks had learned to open the boxes within two weeks.",
        "In a 2024 study, animal behavior researcher Dana Whitlock found that crows in 9 of 12 city parks learned within two weeks to open puzzle boxes by pulling a string.",
        "Animal behavior researcher Dana Whitlock placed puzzle boxes holding food in 12 city parks in 2024.",
        "Crows are clever birds that live in many cities.",
      ],
      right: 1,
      why: "The checklist: who Whitlock is, the study, and its findings. Only one choice gives all three. The first choice states the finding but never says who Whitlock is or what the boxes are, which is the **Missing context** trap. The third introduces her and the method but gives no result, so it is the **Partial** trap. Clever city crows are not in the notes.",
      subject: "reading",
    },
  ],
};

export default lesson;
