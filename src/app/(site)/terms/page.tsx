// ============================================================
// Terms of Service page
// ============================================================

import Link from "next/link";
import SitePage from "@/components/site/SitePage";
import { pageMeta } from "@/components/site/meta";
import { ROUTES } from "@/components/site/routes";
import { GUARANTEE_POLICY } from "@/lib/guarantee/policy";

export const metadata = pageMeta(
  ROUTES.terms,
  "Karman Prep: Terms of Service",
  "Karman's Terms of Service covering subscriptions, sessions, cancellation, prospective course-fee protection, and acceptable use."
);

const SECTIONS = [
  {
    id: "acceptance",
    title: "1. Acceptance of Terms",
    content: `By creating a Karman account or using the Karman platform (karmanprep.com), you agree to these Terms of Service and our Privacy Policy. If you do not agree, do not use the platform. These terms apply to all users including students, parents, and tutors.`,
  },
  {
    id: "subscriptions",
    title: "2. Subscriptions & Billing",
    content: null,
    list: [
      `For new checkouts, a ${GUARANTEE_POLICY.trial.days}-day trial is available only on the Seminar (Group) tier. Other tiers do not receive a trial. Any applicable trial and charge date will be displayed in checkout before purchase. Existing subscriptions and purchase terms are not changed by this prospective policy.`,
      "A payment method may be required at checkout. Any charge timing and recurring amount are shown in the checkout terms for the selected offer.",
      "Monthly subscriptions renew automatically on the same date each month. Annual subscriptions renew on the anniversary of your purchase date.",
      "All prices are in USD and inclusive of applicable taxes where required.",
      "We reserve the right to change pricing with 30 days' advance notice by email. Continued use after the notice period constitutes acceptance of the new price.",
    ],
  },
  {
    id: "cancellation",
    title: "3. Cancellation",
    content: null,
    list: [
      "You may cancel your subscription at any time through Account → Billing → Cancel Subscription, or by emailing billing@karmanprep.com.",
      "Cancellation stops future billing. You retain full platform access through the end of your current billing period.",
      "Cancellation does not automatically generate a refund for the current billing period. See our Refund Policy for details.",
      "If your new purchase includes a trial, the checkout shows its length and cancellation deadline. Cancel before the displayed deadline to avoid the post-trial charge.",
    ],
  },
  {
    id: "sessions",
    title: "4. Session Policies",
    content: null,
    list: [
      "Sessions must be cancelled with at least 24 hours' advance notice to avoid counting against your monthly session allocation.",
      "Late cancellations (under 24 hours) and no-shows count as completed sessions and are not rescheduled without charge.",
      "Three or more no-shows within a single month may result in account review and temporary suspension of session scheduling privileges.",
      "Session recordings: all group sessions are recorded and available to paid subscribers. Private and Elite sessions are not recorded without explicit consent from both the student and tutor.",
      "Karman reserves the right to substitute an equivalent tutor if your scheduled tutor is unavailable, with advance notice where possible.",
    ],
  },
  {
    id: "guarantee",
    title: "5. Prospective Course-Fee Protection",
    content: `The prospective ${GUARANTEE_POLICY.outcome.instructionalWeeks}-week course-fee protection applies only to a specifically identified qualifying one-to-one SAT offer with a positive online-course fee separately disclosed and paid. It is not a fixed score-improvement promise. Current standard checkout offers are not configured as eligible. The full terms are at karmanprep.com/guarantee. Existing purchases remain subject to the purchase-time terms and policy version.`,
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
      'Karman provides the platform "as is" and makes no guarantees of specific score outcomes. Any prospective course-fee protection is limited to the expressly eligible offers and terms shown at purchase.',
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
    content: `For billing or policy questions, use the verified contact route at billing@karmanprep.com.`,
  },
];

export default function TermsPage() {
  return (
    <SitePage kind="inner">
      <article className="legal">
        {/* Header */}
        <section>
          <div>
            <h1>Terms of Service</h1>
            <p>Effective October 8, 2026 · Governing law: Texas, United States</p>
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
              <Link href="/privacy">Privacy Policy</Link>
              <Link href="/refunds">Refund Policy</Link>
              <Link href="/guarantee">Score Guarantee</Link>
            </div>
          </div>
        </div>
      </article>
    </SitePage>
  );
}
