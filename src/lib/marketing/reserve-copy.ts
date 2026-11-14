// Every word on the Reserve a seat pages (/reserve and /reserve/welcome). Numbers come from offer.ts.
import { GUARANTEE as G, MARCH_PROGRAM as MP, formatPrice } from "./offer";

export const RESERVE = {
  title: "Reserve a seat",
  /** Always on screen, so the total is never a surprise (docs/forms/form-rules.md, rule 16). */
  summary: `The ${MP.weeks}-week SAT cohort. ${formatPrice(MP.price)}, or ${formatPrice(MP.depositAmount)} today.`,
  /** "Step 2 of 5" */
  stepOf: "Step {n} of {total}",
  back: "Back",
  next: "Continue",
  optional: "optional",
  who: {
    headline: "Who is reserving the seat?",
    parent: "I'm a parent",
    student: "I'm the student",
  },
  email: {
    parent: { headline: "Where should we send the confirmation?", field: "Your email" },
    student: { headline: "What is your parent's email?", field: "Parent's email" },
    note: "We save your place as you go. No spam, ever.",
  },
  names: {
    parent: {
      headline: "Who is the seat for?",
      name: "Your full name",
      student: "Your student's first name",
    },
    student: {
      headline: "Who is the seat for?",
      name: "Parent's full name",
      student: "Your first name",
    },
    phone: "Mobile phone",
    phoneNote: "Only for class reminders, or if we need to reach you about this seat.",
  },
  score: {
    headline: "Which SAT is the goal?",
    starts: "Classes start",
    closed:
      "The next cohort isn't open yet. Choose Not sure and we'll hold your seat for the right one.",
    notSure: "Not sure yet",
    notSureNote: "We'll hold the seat and agree the date with you.",
  },
  pay: {
    headline: "How would you like to pay?",
    full: "Pay in full",
    fullPrice: formatPrice(MP.price),
    fullNote: "One payment. Pay-later options are offered on the next page.",
    parts: "Deposit, then three payments",
    partsPrice: `${formatPrice(MP.depositAmount)} today`,
    partsNote: `Then ${MP.installments.count} monthly payments of ${formatPrice(MP.installments.amount)}, starting with the first class. The total is the same: ${formatPrice(MP.price)}.`,
    button: "Continue to secure payment",
    sending: "Opening secure payment",
    promise: `Covered by the guarantee: up to +${G.bands[0].cohort} points, or your money back.`,
  },
  errors: {
    email: "Enter an email address, like name@example.com.",
    name: "Enter a name, using letters only.",
    phone: "Enter all 10 digits, or leave it empty.",
    closed: "Registration for that date just closed. Choose another SAT date.",
    server:
      "That didn't go through. Check your connection and try again, or email hello@karmanprep.com.",
  },
  /** Right after payment: Karman the fox asks the few things that get the student started, as a flight
   *  over the landscape (RegistrationFlight.tsx). {name} is the student's first name. */
  start: {
    hello:
      "The seat is reserved. I'm Karman. Five quick questions and {name} is ready for day one.",
    helloButton: "Take off",
    score: {
      say: "Where is {name} taking off from?",
      headline: "Latest SAT score",
      field: "SAT score",
      none: "No SAT yet",
      noneNote:
        "No problem. Before the first class, {name} takes a first full-length test with us.",
      why: "Typing it is fine for now. Before the first class we'll ask for the score report as a PDF.",
    },
    goal: {
      say: "And where do we land?",
      headline: "The score {name} is aiming for",
      field: "Goal score",
    },
    gap: `From {from} to {to}. That's {gap} points, with ${MP.weeks} weeks, ${MP.totalClasses} live classes and ${MP.fullLengthTests} practice tests to get there.`,
    gapNoStart: `A {to}. Good place to land. ${MP.weeks} weeks, ${MP.totalClasses} live classes and ${MP.fullLengthTests} practice tests to get there.`,
    hardest: {
      say: "This tells the tutor where to start.",
      headline: "What feels hardest right now?",
      options: {
        math: "Math",
        reading: "Reading and Writing",
        both: "Both about the same",
        timing: "Running out of time",
      },
    },
    times: {
      say: "Pick every time that could work. We place the class from these.",
      headline: "When can {name} make live classes?",
      options: {
        "weekday-evenings": "Weekday evenings",
        saturday: "Saturdays",
        sunday: "Sundays",
      },
    },
    note: {
      say: "Last one, and it's optional.",
      headline: "Anything the tutor should know?",
      field: "A sport season, a learning difference, a big week",
      skip: "Leave it empty if there's nothing.",
    },
    next: "Continue",
    finish: "Finish",
    saving: "Saving",
    done: "We've landed at the observatory. Welcome, {name}.",
    errors: {
      score: "Enter a score from 400 to 1600 that ends in 0.",
      times: "Pick at least one time.",
      server: "That didn't save. Check your connection and try again.",
    },
    /** The landing: what the family does next. {name} is the student's first name. */
    land: {
      studentTitle: "{name}'s own link",
      studentText:
        "It opens {name}'s account with this seat attached. It works once, for one account only.",
      share: "Send {name} the link",
      copied: "Link copied",
      mine: "Create my account",
      mineTitle: "Your seat is waiting.",
      mineText: "Your account opens the full platform today, with this seat attached.",
      shareText: "Here's your link to set up your Karman account. It only works once:",
      parentTitle: "Your parent portal",
      parentText:
        "Attendance, homework, practice test scores and where the guarantee stands. You make your own sign-in, and a second parent can be added.",
      parentButton: "Open my parent portal",
      then: "What happens after",
      steps: [
        ["Today", "{name}'s account opens the full platform, before the first class."],
        [
          "Before the first class",
          "We ask for the SAT score report as a PDF, or run the first full-length test.",
        ],
        [
          "Once the class is formed",
          "We place {name} with others at the same score, at an hour from the times you picked, and send the schedule.",
        ],
      ] as [string, string][],
      help: "Questions? Email hello@karmanprep.com. A person answers.",
    },
  },
  welcome: {
    waitTitle: "Your payment is on its way.",
    waitText: "This page updates as soon as the payment clears. It usually takes a few seconds.",
    lostTitle: "We can't find that reservation.",
    lostText: "Open the link from your confirmation email, or email hello@karmanprep.com.",
    claimed: "The student's account is set up. Sign in to start.",
    signIn: "Sign in",
  },
} as const;
