# How Karman's forms are built

Founder, 2026-11-13: every form is researched, then built one step at a time, checked, given its motion,
and inspected as a whole before the next form starts. These are the rules that came out of the research
round that day. Each rule says how strong its evidence is. Where the founder's taste and the evidence pull
apart, the note says how both are met.

## The rules

**Length and order**

1. Ask only what is used. A checkout needs about 8 fields; 17% of buyers leave over length (Baymard, strong).
2. The first question is easy and sorts the visitor: "a parent" or "the student" (GOV.UK, moderate;
   foot-in-the-door, weak for forms).
3. Email comes next, alone. Once it is given and Continue is pressed, the lead is saved, so every later
   drop-off can be followed up (business rule; saving on Continue, never keystroke by keystroke).
4. One question, or one small group, to a screen on phones (GOV.UK, moderate).
5. Payment is last, and no account is asked for before it: 18% leave when forced to create one (Baymard,
   strong). The account is made after paying.

**Progress** 6. Show "Step 2 of 5" and a thin bar. The first step is one tap, so early progress feels fast; a bar that
starts slow raises drop-off (Conrad et al., strong).

**Fields** 7. One "Full name" field, not first and last: 42% type a full name into "First name" (Baymard, strong). 8. The field's name stays visible while typing. A placeholder alone is not a label (NN/g, strong). The
founder wants the name inside the pill, so it floats: inside the pill when empty, small at the top of the
pill once there is text. 9. Right keyboard and autofill on every field (`type`, `inputmode`, `autocomplete`); no autocorrect on names
and emails (web.dev, Baymard, strong). 10. Phone is optional and says why it is asked: 14% never give one (Baymard, strong). No marketing texts
without written consent (TCPA). 11. A sensitive question (the score) says in one line why it is asked, and can be skipped (GOV.UK, moderate).

**Checking** 12. Check a field when the visitor leaves it, not while they type; clear the message the moment it is fixed
(Wroblewski, Baymard, strong on direction). 13. The message sits beside its field, keeps what was typed and says how to fix it. No "invalid", no "oops",
no "please" (GOV.UK, strong). 14. The button is never greyed out for missing answers. On press, every gap is shown and the cursor goes to
the first (Build for Good UX part 18; web.dev, moderate). It is disabled only while the server answers,
with a spinner inside it. 15. Button labels say what happens next: "Continue", "Continue to secure payment".

**Money** 16. The full price is on screen from the first step: 12% leave when they cannot see the total (Baymard,
strong). 17. Offer the instalment plan beside paying in full: Stripe measured up to 14% more revenue, most for orders
of $500 to $1,500 (vendor test, moderate). Never reframe $995 as a per-day or per-week price; small-unit
framing reverses for large sums (Gourville, weak to moderate). 18. Reassurance sits at the payment step: who takes the card (Stripe), and the guarantee. 19% leave over card
trust (Baymard, strong).

**Not losing people** 19. Answers survive Back, a refresh and a return from the payment page (Zuko, moderate). 20. An unfinished payment is recovered with a plain reminder first, not a discount (Klaviyo, vendor). Stripe
hands back a recovery link when a checkout expires; the founder is told and can send it. 21. Speed matters: the founder is emailed the moment an email is captured, and again on payment. Contact
within minutes is far likelier to reach the family than contact after half an hour (Lead Response
Management study; old and vendor-run, so weak to moderate).

**After** 22. The confirmation shows a reference, what happens next and when, and how to reach a person; the same goes
by email (GOV.UK, moderate).

**Motion** 23. A step changes in 200 to 300 ms, moving the way the visitor is going; nothing loops. Under reduced
motion the step simply changes (NN/g, moderate).

**Measuring** 24. Each form records, with the visitor's analytics consent and never what was typed: step viewed, step
done, back, a field's failed check (the field's name only), time on the step, the payment option picked,
and the step the page was left on (`form_step` in `src/lib/analytics/events.ts`). The worst step and the
worst field are fixed first, one change at a time.

**Families** 25. The parent is the customer record. About the student we ask a first name only before payment; never the
student's own phone or email (state privacy laws for under-18s; COPPA covers under-13s only).

## What the research could not tell us

No credible study on which payment option to show first, on headlines or button wording for this kind of
purchase, or on parents buying tutoring online. Those are ours to test with rule 24.

## Sources

Baymard Institute (checkout fields, cart abandonment, phone field, required and optional fields, payment
trust); Nielsen Norman Group (placeholders, animation duration); GOV.UK Design System and Service Manual
(form structure, question pages, error messages, confirmation pages); web.dev (payment and address forms);
Luke Wroblewski and A List Apart (inline validation); Conrad, Couper, Tourangeau and Peytchev (progress
indicators); Zuko (field abandonment, multi-step); Stripe (buy now, pay later test; abandoned carts);
Klaviyo (abandoned cart benchmarks); FTC (CAN-SPAM, COPPA); 47 CFR 64.1200 (TCPA); Gourville 1998; the
"Build for Good UX" series by @synsation\_.
