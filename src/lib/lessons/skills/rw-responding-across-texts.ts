import type { Lesson } from "../types";

const lesson: Lesson = {
  id: "rw-responding-across-texts",
  tests: "Predicting how the author of one text would answer a claim made in the other text.",
  spot: "Text 1 and Text 2, and the question asks how the author of Text 2 would most likely respond to a claim in Text 1, often an underlined one.",
  idea: [
    "Start with the **exact claim** in Text 1 the question points to. Then find Text 2's main claim, often after but or in the last sentence.",
    "The most common answer is **yes, but**. Text 2 accepts part of Text 1, then adds a missing factor or a limit. Total rejection is rarer than students expect.",
    "Answer in **Text 2's own logic**. Ask what Text 2's author would say back, using only the reasons Text 2 gives.",
  ],
  rules: ["Find the exact claim", "Find the but in Text 2", "Expect yes, but"],
  figure: {
    kind: "twoTexts",
    a: { title: "Text 1", claim: "Planting trees along city streets cools them in summer." },
    b: {
      title: "Text 2",
      claim:
        "Street trees cool the air, but only if they get enough water to keep their leaves all summer.",
    },
    relation: "answer",
    note: "Yes, but: Text 2 agrees, then adds a limit.",
  },
  strategy: {
    name: "Find the but",
    steps: [
      "Find the exact claim in Text 1 that the question points to.",
      "Find Text 2's main claim, often after but or in the last sentence.",
      "Decide the stance: agree, disagree, or yes, but.",
      "Predict Text 2's answer in its own logic, then match.",
    ],
  },
  examples: [
    {
      title: "Yes, but",
      passage:
        "**Text 1:** Online classes let students learn at their own pace, any time of day. Before long, they will make classroom teaching unnecessary.\n\n**Text 2:** Online classes work well for students who already manage their time well. Many students, however, fall behind without a teacher checking in, and they finish fewer courses online than in person.",
      problem:
        "Based on the texts, how would the author of Text 2 most likely respond to the claim in Text 1?",
      choices: [
        "By agreeing that classroom teaching will soon be unnecessary",
        "By insisting that online classes have no value for any student",
        "By arguing that the claim overlooks students who need a teacher to keep them on track",
        "By arguing that students who fall behind online only need more freedom",
      ],
      right: 2,
      steps: [
        { say: "Find the claim in Text 1: online classes will make classrooms unnecessary." },
        {
          say: "Find Text 2's main claim, after however: many students fall behind without a teacher.",
        },
        {
          say: "Decide the stance: **yes, but**. Text 2 grants that online classes help some students, then adds a limit.",
        },
        {
          say: "Predict: the claim forgets students who need a teacher. No value for any student is too extreme, and more freedom is Text 1's logic, not Text 2's.",
        },
      ],
      answer:
        "By arguing that the claim overlooks students who need a teacher to keep them on track",
      checkIn: {
        text: "Based on the texts, how would the author of Text 2 most likely respond to the claim in Text 1?",
        passage:
          "**Text 1:** Electric cars give off no exhaust. If everyone drove one, cars would no longer harm the air at all.\n\n**Text 2:** Electric cars do not give off exhaust, which is a real gain for city air. But the electricity that charges them often comes from power plants that burn coal or gas, so their effect on the air depends on how that power is made.",
        choices: [
          "By agreeing that electric cars would end all harm to the air",
          "By arguing that electric cars make city air dirtier than gas cars do",
          "By arguing that electric cars cost too much for most families",
          "By pointing out that the claim ignores how the electricity for the cars is made",
        ],
        right: 3,
        why: "Text 2 agrees that no exhaust is a gain, but adds that the power often comes from plants that burn coal or gas. So it would say Text 1 leaves that out. Saying electric cars make the air dirtier goes much further than Text 2 does, the **Too extreme** trap.",
        twin: {
          text: "Based on the texts, how would the author of Text 2 most likely respond to the claim in Text 1?",
          passage:
            "**Text 1:** Homework teaches students to work on their own. Schools should give every student at least two hours of it each night.\n\n**Text 2:** Some homework helps students practice what they learned in class. But studies of younger students find little benefit from long assignments, and too much homework can leave students tired and less eager to learn.",
          choices: [
            "By arguing that the claim overlooks the drawbacks of long assignments",
            "By agreeing that every student needs at least two hours of homework each night",
            "By insisting that schools should ban homework completely",
            "By arguing that students should study in groups instead of alone",
          ],
          right: 0,
          why: "Text 2 grants that some homework helps, but warns that long assignments bring little benefit and can tire students, so it would push back on two hours a night. Banning homework goes further than Text 2 does, the **Too extreme** trap.",
        },
      },
    },
    {
      title: "Another cause",
      passage:
        "**Text 1:** In one large survey, people who drank coffee every day tended to live longer than people who did not. Drinking coffee, then, must help people live longer.\n\n**Text 2:** When two things show up together, one does not always cause the other. Daily coffee drinkers may share other habits, such as regular exercise, that could explain why they live longer.",
      problem:
        "Based on the texts, how would the author of Text 2 most likely respond to the conclusion in Text 1?",
      choices: [
        "By arguing that the link between coffee and long life may be explained by other habits",
        "By claiming that drinking coffee shortens people's lives",
        "By agreeing that coffee is the reason coffee drinkers live longer",
        "By questioning whether the people in the survey really drank coffee",
      ],
      right: 0,
      steps: [
        { say: "Find the claim in Text 1: coffee must cause longer life." },
        {
          say: "Find Text 2's main claim: things that show up together do not always cause each other.",
        },
        {
          say: "Decide the stance: Text 2 accepts the survey result but doubts that coffee is the cause.",
        },
        {
          say: "Predict: other habits may explain it. Shortens lives is too extreme, agreeing misses the doubt, and Text 2 never questions what people drank.",
        },
      ],
      answer:
        "By arguing that the link between coffee and long life may be explained by other habits",
      tryFrom: 2,
      checkIn: {
        text: "Based on the texts, how would the author of Text 2 most likely respond to the conclusion in Text 1?",
        passage:
          "**Text 1:** Students who eat breakfast every day earn higher grades than students who skip it. Eating breakfast, then, must make students do better in school.\n\n**Text 2:** Families who make breakfast every day may also keep regular bedtimes and check on homework. Those habits, not the meal itself, could explain the higher grades.",
        choices: [
          "By claiming that eating breakfast lowers students' grades",
          "By arguing that the link between breakfast and grades may be explained by other family habits",
          "By agreeing that breakfast is the reason for the higher grades",
          "By questioning whether the grades were recorded correctly",
        ],
        right: 1,
        why: "Text 2 suggests that other habits, like regular bedtimes, could explain the grades, so it would say Text 1 jumps too fast from a link to a cause. Claiming breakfast lowers grades turns the finding around, which Text 2 never does.",
        twin: {
          text: "Based on the texts, how would the author of Text 2 most likely respond to the conclusion in Text 1?",
          passage:
            "**Text 1:** Cities with more bike lanes have fewer traffic deaths. Building bike lanes, then, must make streets safer for everyone.\n\n**Text 2:** Cities that build many bike lanes often also lower speed limits and add crosswalks at the same time. Those changes could explain much of the drop in traffic deaths.",
          choices: [
            "By agreeing that bike lanes alone explain the drop in traffic deaths",
            "By arguing that bike lanes cause more traffic deaths",
            "By questioning whether the cities counted their bike lanes correctly",
            "By arguing that other street changes may explain the drop in traffic deaths",
          ],
          right: 3,
          why: "Text 2 points to lower speed limits and new crosswalks added at the same time, so it would say the drop may not be due to bike lanes alone. Saying bike lanes cause more deaths reverses the finding, which Text 2 never claims.",
        },
      },
    },
  ],
  traps: [
    {
      name: "Reversed roles",
      text: "The choice gives how Text 1's author would answer Text 2, not the other way around. Check who is responding to whom.",
    },
    {
      name: "Too extreme",
      text: "The choice has Text 2 reject Text 1 completely, when Text 2 only adds a limit or another cause.",
    },
    {
      name: "Off target",
      text: "The choice answers a claim Text 1 never made, or picks at a detail instead of the claim the question names.",
    },
  ],
  tip: {
    kind: "reading",
    title: "Expect yes, but",
    steps: [
      "Most Text 2 authors agree in part, then add a limit.",
      "Find the but, however or yet in Text 2; the limit comes right after it.",
      "Prefer a choice that grants a point and adds that limit over one that throws out Text 1 completely.",
    ],
  },
  check: {
    passage:
      "**Text 1:** Video games are a waste of time for children. Nothing useful comes from hours spent in front of a screen.\n\n**Text 2:** Some fast-paced action games seem to sharpen how quickly players notice changes on a screen. These gains, though, do not appear to make players any better at schoolwork.",
    text: "Based on the texts, how would the author of Text 2 most likely respond to the claim in Text 1?",
    choices: [
      "By agreeing that nothing useful comes from playing video games",
      "By pointing out that some games may build certain skills, even if not school skills",
      "By arguing that video games make children better at schoolwork",
      "By saying that children should play games instead of doing homework",
    ],
    right: 1,
    why: "Text 1 says nothing useful comes from games. Text 2 says some games sharpen how fast players notice changes, though not their schoolwork, so it would answer that some skills do come from games. Agreeing ignores that gain. Better at schoolwork contradicts Text 2's though. Games instead of homework is off target and too extreme.",
  },
  quiz: [
    {
      passage:
        "**Text 1:** The town's new traffic lights cut accidents on Main Street by half in their first year. The lights alone made the street safer.\n\n**Text 2:** The same year the lights went up, the town also lowered the speed limit on Main Street and painted new crosswalks. Any of these changes could have made drivers more careful.",
      text: "Based on the texts, how would the author of Text 2 most likely respond to the claim in Text 1?",
      choices: [
        "By agreeing that the lights alone made Main Street safer",
        "By arguing that the lights made Main Street more dangerous",
        "By noting that traffic lights cannot work on busy streets",
        "By pointing out that other changes made the same year may explain the drop in accidents",
      ],
      right: 3,
      why: "Find the but: Text 2 does not deny the drop, but it names other changes made the same year, so it would say the lights alone may not deserve the credit. Agreeing that the lights alone did it ignores those changes. More dangerous is the **Too extreme** trap, since Text 2 accepts that accidents fell. Busy streets are the **Off target** trap: Text 1 never makes that claim.",
      subject: "reading",
    },
    {
      passage:
        "**Text 1:** Some city leaders argue that <u>free public transit would draw so many new riders that traffic jams would disappear</u>.\n\n**Text 2:** Cities that made their buses free did gain riders, but many of the new riders used to walk or bike, not drive. Car traffic barely changed.",
      text: "A question asks how the author of Text 2 would most likely respond to the underlined claim. What should a student do first?",
      choices: [
        "Decide how the city leaders in Text 1 would answer Text 2",
        "Look for the choice in which Text 2 rejects free transit completely",
        "Find exactly what the underlined claim in Text 1 says",
        "Find the choice that repeats the most words from Text 2",
      ],
      right: 2,
      why: "Start with the exact claim: free transit would end traffic jams. Only then can you see that Text 2 says yes to more riders, but not fewer cars. Deciding how Text 1 would answer is the **Reversed roles** trap. Looking for a complete rejection leads to Too extreme. Matching words from Text 2 skips the claim and can land Off target.",
      subject: "reading",
    },
    {
      passage:
        "**Text 1:** Homework in elementary school builds good study habits that pay off in later grades.\n\n**Text 2:** For young children, homework shows little link to better grades. Reading for fun and playing outside may do more for them than worksheets.",
      text: "A student said the author of Text 2 would respond by insisting that study habits formed early help students in later grades. Why is this answer wrong?",
      choices: [
        "It gives how the author of Text 1 would respond to Text 2, not the other way around.",
        "It goes too far, since Text 2 accepts that homework builds study habits.",
        "It answers a claim about reading for fun that Text 1 never makes.",
        "It is half right, since Text 2 agrees about study habits but not about grades.",
      ],
      right: 0,
      why: "The student's answer is Text 1's own view, so it is the **Reversed roles** trap: Text 1 would say that back to Text 2. Text 2 doubts homework helps young children, so it would answer with that doubt. Text 2 never accepts that homework builds study habits. The student's answer is not about reading for fun. Text 2 never agrees about study habits.",
      subject: "reading",
    },
    {
      passage:
        "**Text 1:** Libraries should keep printed books at the center of their collections, because readers remember more of what they read on paper.\n\n**Text 2:** Libraries should spend most of their budgets on e-books, which readers can borrow at any hour without traveling.",
      text: "Based on the texts, how would the author of Text 1 most likely respond to the proposal in Text 2?",
      choices: [
        "By arguing that easy access matters more than how well readers remember",
        "By warning that the proposal would give readers a format they remember less well",
        "By agreeing that e-books should take most of the budget",
        "By arguing that libraries should stop lending books of any kind",
      ],
      right: 1,
      why: "Read the question closely: this time Text 1 responds to Text 2. In Text 1's logic, paper helps readers remember, so it would warn that e-books mean remembering less. Easy access mattering more is Text 2's view, so that choice is the **Reversed roles** trap. Agreeing ignores Text 1's whole point. Stopping all lending is the **Too extreme** trap and Off target.",
      subject: "reading",
    },
    {
      passage:
        "**Text 1:** Many art historians claim that <u>the painter Clara Venn stopped using color late in her career because her eyesight was failing</u>.\n\n**Text 2:** Venn's letters from those years do mention trouble with her eyes. Yet the same letters are full of excitement about black-and-white photography, which she praised again and again. Her gray paintings may reflect a new interest as much as a loss.",
      text: "Based on the texts, how would the author of Text 2 most likely respond to the underlined claim in Text 1?",
      choices: [
        "By rejecting the idea that Venn had any trouble with her eyes",
        "By arguing that Venn's photographs were more important than her paintings",
        "By granting that her eyesight may have played a part but suggesting that a new interest also explains the change",
        "By agreeing that failing eyesight fully explains why Venn stopped using color",
      ],
      right: 2,
      why: "Find the but: Text 2 grants the eye trouble, then at Yet adds her excitement about photography. That is yes, but: eyesight may matter, and a new interest matters too. Rejecting any eye trouble is the **Too extreme** trap, since the letters mention it. Photos mattering more than paintings is the **Off target** trap. Agreeing that eyesight fully explains it ignores everything after Yet.",
      subject: "reading",
    },
  ],
};

export default lesson;
