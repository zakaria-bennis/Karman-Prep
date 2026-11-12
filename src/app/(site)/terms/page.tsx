// ============================================================
// Terms of Service page
// ============================================================

import SitePage from "@/components/site/SitePage";
import { pageMeta } from "@/components/site/meta";
import { ROUTES } from "@/components/site/routes";
import {
  CONTACT,
  formatPrice as $,
  FREE_PLAN,
  GUARANTEE as G,
  type GuaranteeTrack,
  guaranteeBandLabel,
  MARCH_PROGRAM as MP,
  PLAN_RENEWAL,
  PRACTICE_PLAN,
  PRIVATE_PACKAGES,
  PRO_PLAN,
  SCHOOL_PLAN,
  TUTOR_AFFILIATE_PLAN as TA,
} from "@/lib/marketing/offer";
import { SCHOLARSHIP_TERMS_SECTION } from "@/lib/scholarship/terms-section";

const [P10, P20] = PRIVATE_PACKAGES;

/** "+200 points from a baseline of 1200 or lower; +150 from 1210 to 1300; ..." for one track. */
const targets = (track: GuaranteeTrack) =>
  G.bands
    .map(
      (b, i) =>
        `+${b[track]}${i === 0 ? " points from a baseline of" : " from"} ${guaranteeBandLabel(i)}`
    )
    .join("; ");

export const metadata = pageMeta(
  ROUTES.terms,
  "Karman Prep: Terms of Service",
  "Karman's Terms of Service covering plans and billing, school licenses, tutor affiliates, cancellation, sessions, the guarantee, and acceptable use."
);

const SECTIONS = [
  {
    id: "acceptance",
    title: "1. Acceptance of Terms",
    content: `By creating a Karman account or using the Karman platform (karmanprep.com), you agree to these Terms of Service and our Privacy Policy. If you do not agree, do not use the platform. These terms apply to all users including students, parents, and tutors.`,
  },
  {
    id: "subscriptions",
    title: "2. Plans & Billing",
    content: null,
    list: [
      `Karman's plans: ${FREE_PLAN.name} (${FREE_PLAN.questionLimit} practice questions in total and one full-length practice test, no card); ${PRACTICE_PLAN.name}, ${$(PRACTICE_PLAN.monthly)} a month or ${$(PRACTICE_PLAN.threeMonths)} for 3 months; ${PRO_PLAN.name}, ${$(PRO_PLAN.monthly)} a month or ${$(PRO_PLAN.threeMonths)} for 3 months; the ${MP.planName}, ${$(MP.price)}; ${P10.name}, ${P10.hours} hours for ${$(P10.price)}; ${P20.name}, ${P20.hours} hours for ${$(P20.price)}; ${SCHOOL_PLAN.name}, ${$(SCHOOL_PLAN.pricePerStudentPerYear)} per student a year, the first year free; ${TA.name}, ${$(TA.monthly)} a month per tutor. There are no free trials; the ${FREE_PLAN.name} plan is how to try Karman.`,
      "The amount and the charge date are shown at checkout before you pay.",
      `${PLAN_RENEWAL} The ${MP.planName} and the private packages are one-time payments and do not renew.`,
      `The ${MP.planName} is paid in full, or with a ${$(MP.depositAmount)} refundable deposit and ${MP.installments.count} payments of ${$(MP.installments.amount)}. The deposit is part of the ${$(MP.price)}, not extra. Private packages are paid in full before the first session.`,
      `A school license gives every enrolled student a ${PRACTICE_PLAN.name} plan of their own. It is not a shared pool of questions or seats. The first year is free; after that the school is invoiced ${$(SCHOOL_PLAN.pricePerStudentPerYear)} per student a year.`,
      `A ${TA.name} subscription comes with one code. Up to ${TA.maxStudents} students who redeem it get the ${PRACTICE_PLAN.name} plan free while the tutor's subscription is active; when it ends, those students move to the ${FREE_PLAN.name} plan unless they buy a plan of their own. The tutor can see each redeemed student's progress, assign work, manage the roster and remove a student. A student can leave a tutor's roster at any time.`,
      "All prices are in USD and inclusive of applicable taxes where required.",
      "We reserve the right to change pricing with 30 days' advance notice by email. Continued use after the notice period constitutes acceptance of the new price.",
    ],
  },
  {
    id: "cancellation",
    title: "3. Cancellation",
    content: null,
    list: [
      `You may cancel a ${PRACTICE_PLAN.name}, ${PRO_PLAN.name} or ${TA.name} subscription at any time through Account → Billing → Cancel Subscription, or by emailing ${CONTACT.billing}.`,
      "Cancellation stops future billing. You retain full platform access through the end of your current billing period.",
      "Cancellation does not automatically generate a refund for the current billing period. See our Refund Policy for details.",
    ],
  },
  {
    id: "sessions",
    title: "4. Session Policies",
    content: null,
    list: [
      `Private sessions must be cancelled with at least ${G.private.cancelHours} hours' notice. A later cancellation or a no-show counts as a used hour of the package.`,
      "Three or more no-shows within a single month may result in account review and temporary suspension of session scheduling privileges.",
      "Session recordings: live cohort classes may be recorded for the students in that cohort. Private sessions are not recorded without explicit consent from both the student and tutor.",
      "Karman reserves the right to substitute an equivalent tutor if your scheduled tutor is unavailable, with advance notice where possible.",
    ],
  },
  {
    id: "guarantee",
    title: "5. The Karman Guarantee",
    content: `The ${MP.planName}, ${P10.name} and ${P20.name} carry the Karman guarantee. The target depends on the baseline score and the plan. On ${P20.name}: ${targets("private")}. On the ${MP.planName} and ${P10.name}: ${targets("cohort")}. From a baseline of ${G.noGuaranteeFrom} or higher there is no points target: the promise is that the score rises, and if it does not, the student receives ${G.highStartProMonths} months of Pro at no charge. A ${G.topScore} always counts. If every requirement is met and the SAT falls short, the family gets the remedy shown at karmanprep.com/guarantee: on the ${MP.planName}, half or all of the price back, or the next cohort free; on Private 10, half the price back; on Private 20, free extra hours, then half the price back. ${PRACTICE_PLAN.name}, ${PRO_PLAN.name}, ${FREE_PLAN.name}, school licenses and ${TA.name} plans carry no guarantee. The requirements, eligibility and how to claim are listed in full on the guarantee page, and for private tutoring on the private tutoring page.`,
  },
  {
    id: "acceptable-use",
    title: "6. Acceptable Use",
    content: null,
    list: [
      "Accounts are for individual use only. Sharing login credentials with others is prohibited and may result in account termination.",
      "You may not reproduce, distribute, or resell any Karman curriculum, lesson content, or platform materials without written permission.",
      "You may not record tutoring sessions without the explicit consent of your tutor and Karman.",
      "Abusive, harassing, or disrespectful behavior toward tutors or Karman staff will result in immediate account termination without refund.",
      "Karman's platform and content are for lawful educational use only.",
    ],
  },
  {
    id: "intellectual-property",
    title: "7. Intellectual Property",
    content: `All content on the Karman platform — including lesson videos, diagnostic questions, curriculum materials, graphics, and software — is the exclusive property of Karman or its licensors. Nothing in these Terms grants you ownership or a license to use Karman's intellectual property outside of your personal, non-commercial educational use on the platform.`,
  },
  {
    id: "disclaimers",
    title: "8. Disclaimers & Limitation of Liability",
    content: null,
    list: [
      'Karman provides the platform "as is" and promises no specific score outcome, except the guarantee in section 5 on the plans that carry it.',
      "Karman is not liable for internet connectivity issues, College Board testing irregularities, or student circumstances outside our control that affect test performance.",
      "To the maximum extent permitted by law, Karman's total liability for any claim is limited to the amount you paid in the preceding 3 months.",
    ],
  },
  {
    id: "governing-law",
    title: "9. Governing Law",
    content: `These Terms are governed by the laws of the State of Texas, United States, without regard to conflict of law principles. Any disputes will be resolved in the courts of Travis County, Texas.`,
  },
  {
    id: "changes",
    title: "10. Changes to These Terms",
    content: `Karman may update these Terms at any time. We will notify you by email at least 14 days before material changes take effect. Continued use of the platform after that date constitutes acceptance of the updated Terms.`,
  },
  {
    id: "contact",
    title: "11. Contact",
    content: `For billing or policy questions, write to ${CONTACT.billing}.`,
  },
  SCHOLARSHIP_TERMS_SECTION,
];

export default function TermsPage() {
  return (
    <SitePage kind="inner">
      <article className="legal">
        {/* Header */}
        <section>
          <div>
            <h1>Terms of Service</h1>
            <p>Effective November 8, 2026 · Governing law: Texas, United States</p>
          </div>
        </section>

        {/* Table of contents + content */}
        <div>
          {/* TOC sidebar — hidden on mobile */}
          <aside>
            <div>
              <p>Contents</p>
              <nav>
                {SECTIONS.map((s) => (
                  <a key={s.id} href={`#${s.id}`}>
                    {s.title}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          {/* Content */}
          <div>
            {SECTIONS.map((section) => (
              <section key={section.id} id={section.id}>
                <h2>{section.title}</h2>
                {section.content && <p>{section.content}</p>}
                {section.list && (
                  <ul>
                    {section.list.map((item, i) => (
                      <li key={i}>
                        <span />
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}

            <div>
              <a href="/privacy">Privacy Policy</a>
              <a href="/refunds">Refund Policy</a>
              <a href="/guarantee">Score Guarantee</a>
            </div>
          </div>
        </div>
      </article>
    </SitePage>
  );
}
