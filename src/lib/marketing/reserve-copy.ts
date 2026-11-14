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
      "Registration for the next cohorts is closed. Email hello@karmanprep.com and we'll find a seat.",
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
    safe: "You pay on Stripe's secure page. We never see your card.",
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
      "The seat is reserved. I'm Karman, and this is Ollie. Five quick questions and {name} is ready for day one.",
    helloButton: "Take off",
    score: {
      say: "Where is {name} taking off from?",
      headline: "Latest SAT score",
      field: "SAT score",
      none: "No SAT yet",
      noneNote: "No problem. A placement test with us sets the starting point.",
      why: "It sets the starting point for the guarantee.",
    },
    goal: {
      say: "And where do we land?",
      headline: "The score {name} is aiming for",
      field: "Goal score",
    },
    gap: "From {from} to {to}. That's {gap} points to fly, and steady work covers it.",
    gapNoStart: "A {to}. Good place to land. We'll find the starting point first.",
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
    done: "We've landed. {name} is all set.",
    doneNote: "Thank you. A copy of everything is in your inbox.",
    errors: {
      score: "Enter a score from 400 to 1600 that ends in 0.",
      times: "Pick at least one time.",
      server: "That didn't save. Check your connection and try again.",
    },
  },
  welcome: {
    paidTitle: "The seat is reserved.",
    paidText: "Thank you. A copy of this is in your inbox. Here is what happens next.",
    reference: "Your reference",
    help: "Questions? Email hello@karmanprep.com. A person answers.",
    waitTitle: "Your payment is on its way.",
    waitText: "This page updates as soon as the payment clears. It usually takes a few seconds.",
    lostTitle: "We can't find that reservation.",
    lostText: "Open the link from your confirmation email, or email hello@karmanprep.com.",
    steps: [
      ["Create the student's account", "It opens the full platform today, before the first class."],
      [
        "Send the score report",
        `Email the official SAT score report (the PDF) to ${G.claimEmail}, for the guarantee. No SAT yet? We'll email a time for the placement test.`,
      ],
      [
        "Get the class times",
        "We place your student with others at the same score, and send the schedule before the first week.",
      ],
    ] as [string, string][],
    button: "Create the student's account",
    claimed: "The student's account is set up. Sign in to start.",
    signIn: "Sign in",
  },
} as const;
