import type { Lesson } from "../types";

const lesson: Lesson = {
  id: "m-studies-and-experiments",
  tests:
    "Deciding what a study's design lets you conclude: whether its result reaches a larger group, and whether it can show cause and effect.",
  spot: "A paragraph on how people or things were chosen and what was done to them, then choices that each make a claim about the result.",
  idea: [
    "Two random steps answer two different questions. **Random selection** from a group lets the result reach that whole group.",
    "**Random assignment** to treatments, as in an experiment, lets you say the treatment caused the difference.",
    "With no random assignment, a study shows only an **association**: the two things go together, but something else may cause both.",
    "With no random selection, the result reaches only subjects like the ones studied.",
  ],
  rules: [
    "Random selection: reach that group",
    "Random assignment: cause and effect",
    "Neither: a link, for these subjects only",
  ],
  figure: {
    kind: "data",
    chart: "table",
    head: ["", "Randomly selected", "Not randomly selected"],
    rows: [
      ["Randomly assigned", "Cause, whole group", "Cause, these subjects"],
      ["Not randomly assigned", "Link, whole group", "Link, these subjects"],
    ],
    highlight: [[0, 1]],
  },
  strategy: {
    name: "Two random checks",
    steps: [
      "Ask: were the subjects chosen at random from a larger group? If so, the result reaches that group, and no further.",
      "Ask: were the treatments given out at random? If so, a cause is fair to claim.",
      "Cross out claims that reach too far or claim a cause the design does not allow.",
      "Cross out claims that are weaker than the design allows, then pick the one left.",
    ],
  },
  examples: [
    {
      title: "Volunteer experiment",
      problem:
        "A coach recruited 120 volunteer runners. Half were randomly assigned to stretch for 10 minutes before each run, and half did not stretch. After 6 weeks, the stretching group had fewer injuries. Which conclusion is best supported?",
      choices: [
        "No conclusion can be drawn, because the runners were volunteers.",
        "Stretching is linked to fewer injuries, but it cannot be said to cause them.",
        "Stretching likely caused fewer injuries among runners like those in the study.",
        "Stretching likely causes fewer injuries for all runners.",
      ],
      right: 2,
      steps: [
        {
          say: "Random selection? No. The runners volunteered, so the result reaches only runners like them.",
        },
        {
          say: "Random assignment? Yes. The coach gave out stretching at random, so a cause is fair to claim.",
        },
        {
          say: "Cross out all runners, which reaches too far, and the two claims that are too weak: no conclusion, and linked only.",
        },
      ],
      answer: "Stretching likely caused fewer injuries among runners like those in the study.",
      checkIn: {
        text: "A teacher asked for volunteers and got 80 students. Half were randomly assigned to study with flashcards each night, and half were not. After a month, the flashcard group scored higher on a vocabulary test. Which conclusion is best supported?",
        choices: [
          "No conclusion can be drawn, because the students were volunteers.",
          "Using flashcards is linked to higher scores, but it cannot be said to cause them.",
          "Using flashcards likely causes higher scores for all students.",
          "Using flashcards likely caused higher scores among students like those in the study.",
        ],
        right: 3,
        why: "The students volunteered, so the result reaches only students like them. But the flashcards were given out at random, so a cause is fair to claim. Saying they are only linked is the **Too timid** trap.",
        twin: {
          text: "A gym asked for volunteers and got 60 members. Half were randomly assigned to a new workout plan, and half kept their usual plan. After 8 weeks, the new plan group lifted more weight, on average. Which conclusion is best supported?",
          choices: [
            "No conclusion can be drawn, because the members were volunteers.",
            "The new plan likely caused heavier lifts among members like those in the study.",
            "The new plan is linked to heavier lifts, but it cannot be said to cause them.",
            "The new plan likely causes heavier lifts for all gym members.",
          ],
          right: 1,
          why: "The plan was given out at random, so a cause is fair to claim. But the members volunteered, so the result reaches only members like them. All gym members is the **Reaching too far** trap.",
        },
      },
    },
    {
      title: "Random survey",
      problem:
        "A city chose 500 of its adults at random and asked how often they use the city's parks and how they rate their own health. Adults who used the parks more often rated their health higher, on average. Which conclusion is best supported?",
      choices: [
        "Using the parks more often causes better health for the city's adults.",
        "Among the city's adults, more park use is linked to higher health ratings.",
        "Among adults in every city, more park use is linked to higher health ratings.",
        "Using the parks more often causes better health, but only for the 500 adults surveyed.",
      ],
      right: 1,
      steps: [
        {
          say: "Random selection? Yes, from the city's adults. The result can reach all of the city's adults.",
        },
        {
          say: "Random assignment? No. People chose how often to visit, so healthy people may simply visit more. Only a link is fair.",
        },
        {
          say: "Keep the claim that is a link and stays inside this city. Both cause claims go, and so does every city.",
        },
      ],
      answer: "Among the city's adults, more park use is linked to higher health ratings.",
      tryFrom: 1,
      checkIn: {
        text: "A school district chose 400 of its students at random and asked how many hours they sleep and what their average grade is. Students who slept more had higher grades, on average. Which conclusion is best supported?",
        choices: [
          "Among the district's students, more sleep is linked to higher grades.",
          "Sleeping more causes higher grades for the district's students.",
          "Among students in every district, more sleep is linked to higher grades.",
          "Sleeping more causes higher grades, but only for the 400 students surveyed.",
        ],
        right: 0,
        why: "The students were chosen at random from the district, so the result reaches the whole district. No one was assigned to sleep more, so only a link is fair. The two cause claims fall for the **Cause from a survey** trap.",
        twin: {
          text: "A library chose 300 of its members at random and asked how many books they read each month and how they rate their stress. Members who read more rated their stress lower, on average. Which conclusion is best supported?",
          choices: [
            "Reading more causes lower stress for the library's members.",
            "Among people in every town, reading more is linked to lower stress ratings.",
            "Among the library's members, reading more is linked to lower stress ratings.",
            "Reading more causes lower stress, but only for the 300 members surveyed.",
          ],
          right: 2,
          why: "The members were chosen at random from the library, so the result reaches all its members, and no farther. No one was assigned to read more, so only a link is fair. Every town is the **Reaching too far** trap.",
        },
      },
    },
  ],
  traps: [
    {
      name: "Cause from a survey",
      text: "Without random assignment, people choose their own treatment, and something else may drive both things. A survey or an observation shows a link, not a cause.",
    },
    {
      name: "Reaching too far",
      text: "A result reaches only the group the subjects were randomly chosen from. Volunteers reach only people like themselves, and one city does not speak for every city.",
    },
    {
      name: "Too timid",
      text: "When the treatments were randomly assigned, a claim that no cause can be shown is wrong. Do not cross out a claim the design does support.",
    },
  ],
  tip: {
    kind: "calculator",
    title: "Keep it closed",
    steps: [
      "These questions are about design, not numbers, so the calculator cannot answer them.",
      "Its one small use: the gap between the two groups' results, when a choice quotes one.",
    ],
    type: ["8.4-6.9"],
    note: "A gap like 8.4 minus 6.9 is faster by hand. Spend the time on the two random checks instead.",
  },
  check: {
    text: "A gym asked its members to fill out an online survey, and 90 members replied. Members who worked out more often reported better sleep. Which conclusion is best supported?",
    choices: [
      "Working out more causes better sleep for the gym's members.",
      "Among all the gym's members, more workouts are linked to better sleep.",
      "Among the 90 members who replied, more workouts went with better sleep.",
      "Working out more causes better sleep for the 90 members who replied.",
    ],
    right: 2,
    why: "The members chose to reply, so there was no random selection, and the result reaches only those 90. No one was assigned how often to work out, so only a link is fair. All the gym's members reaches too far, and both cause claims are the **Cause from a survey** trap.",
  },
  quiz: [
    {
      text: "A grocery chain chose 400 of its shoppers at random and recorded how often each one used the store's app and how much each spent per month. Shoppers who used the app more spent more, on average. Which conclusion is best supported?",
      choices: [
        "Using the app causes the chain's shoppers to spend more.",
        "Using the app causes shoppers at every store to spend more.",
        "Among the chain's shoppers, more app use is linked to more spending.",
        "Among shoppers at every store, more app use is linked to more spending.",
      ],
      right: 2,
      why: "Two random checks: the shoppers were chosen at random from the chain, so the result reaches the chain's shoppers. No one was assigned to use the app, so only a link is fair. Both cause claims are the **Cause from a survey** trap; shoppers who already spend a lot may simply use the app more. Every store is the **Reaching too far** trap.",
      subject: "math",
    },
    {
      text: "A report says: we grew 80 tomato plants, gave some a new fertilizer and the rest the old one, and the new fertilizer grew taller plants. Before you decide whether the new fertilizer caused the extra growth, what should you find out first?",
      choices: [
        "How much taller the new fertilizer's plants grew",
        "Whether the plants were randomly assigned to the two fertilizers",
        "Whether the plants were randomly chosen from all tomato plants",
        "Whether more than 50 plants were in the study",
      ],
      right: 1,
      why: "A cause needs random assignment, so check that first. If the gardener chose which plants got the new fertilizer, the strongest plants may have gotten it. Random selection decides how far the result reaches, not whether it shows a cause. How much taller and how many plants do not answer the cause question at all.",
      subject: "math",
    },
    {
      text: "A survey of 1,000 randomly chosen adults in a state found that adults who eat breakfast every day report fewer sick days. A news report says: eating breakfast prevents illness for the state's adults. Why is the report's claim not supported?",
      choices: [
        "The adults were not randomly chosen from the state.",
        "A survey of 1,000 adults is too small to say anything about a state.",
        "The claim should be about adults in the whole country, not just the state.",
        "No one was randomly assigned to eat breakfast, so the survey shows only a link.",
      ],
      right: 3,
      why: "Prevents is a cause, and a cause needs random assignment. Adults chose whether to eat breakfast, so the report falls into the **Cause from a survey** trap; people with healthy habits may both eat breakfast and get sick less. The adults were chosen at random, so the state is fine. 1,000 is plenty. The whole country would be Reaching too far.",
      subject: "math",
    },
    {
      text: "A school district wants to know whether a new reading program causes higher test scores for all the students in the district. Which study design would let it reach that conclusion?",
      choices: [
        "Randomly select 300 of the district's students, then randomly assign half to the program and half to the usual lessons.",
        "Randomly select 300 of the district's students, then compare those who chose the program with those who did not.",
        "Ask for 300 volunteers from the district, then randomly assign half to the program and half to the usual lessons.",
        "Give the program to every student at one school, then compare with a school that does not use it.",
      ],
      right: 0,
      why: "The district needs both random checks: random selection to reach every student in the district, and random assignment to show a cause. Only the first plan has both. Letting students choose has no random assignment, the **Cause from a survey** trap. Volunteers cannot reach the whole district, the **Reaching too far** trap. Two whole schools have neither.",
      subject: "math",
    },
    {
      text: "A company chose 200 of its 5,000 employees at random. Half of the chosen employees were randomly assigned to work at standing desks for a month, and the rest kept their usual desks. The standing group reported less back pain. Which conclusion is best supported?",
      choices: [
        "Standing desks likely reduce back pain for office workers at every company.",
        "Standing desks are linked to less back pain at the company, but no cause can be claimed.",
        "Standing desks likely reduce back pain for the company's employees.",
        "Standing desks likely reduce back pain, but only for the 200 employees in the study.",
      ],
      right: 2,
      why: "Both random checks pass: the employees were randomly chosen from the company, and the desks were randomly assigned. So a cause is fair, and it reaches the company's 5,000 employees. Every company is the **Reaching too far** trap. No cause, and only the 200, are both Too timid: they throw away what the random steps earned.",
      subject: "math",
    },
  ],
};

export default lesson;
