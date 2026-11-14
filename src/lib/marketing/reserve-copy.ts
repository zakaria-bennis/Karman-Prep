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
    field: "Latest SAT score",
    why: "It sets the starting point for the guarantee. No SAT yet? Leave it empty. A placement test with us sets it.",
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
    score: "Enter a score from 400 to 1600 that ends in 0, or leave it empty.",
    closed: "Registration for that date just closed. Choose another SAT date.",
    server:
      "That didn't go through. Check your connection and try again, or email hello@karmanprep.com.",
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
        "Send the starting score",
        `Email the official SAT score report to ${G.claimEmail}. No SAT yet? We'll email a time for the placement test.`,
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
