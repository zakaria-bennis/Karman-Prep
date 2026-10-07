const STEPS = [
  {
    number: "01",
    title: "Tell us your starting point",
    description:
      "Create an account and answer questions about your test date, goal, and study time. You can say if you do not have a recent score.",
  },
  {
    number: "02",
    title: "Review your options",
    description:
      "See a suggested plan and why it was selected from your answers. Choosing a plan starts checkout.",
  },
  {
    number: "03",
    title: "Explore your starting skills",
    description:
      "You can also take the 35-question diagnostic after signing in. It shows how you did on the skills covered by those questions.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-night py-20 text-ivory sm:py-28">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <div className="grid gap-8 border-t border-bronze pt-6 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] md:gap-16">
          <div>
            <h2 className="max-w-md font-plex-serif text-4xl leading-tight sm:text-5xl">
              Start with what you know. Leave with a next move.
            </h2>
            <p className="mt-5 max-w-sm leading-relaxed text-taupe">
              Here is what happens after you create an account. The diagnostic is available as an
              optional way to see your starting skills.
            </p>
          </div>
          <ol className="border-t border-bronze md:border-t-0">
            {STEPS.map((step) => (
              <li
                key={step.number}
                className="grid grid-cols-[3rem_minmax(0,1fr)] gap-5 border-b border-bronze py-6 sm:gap-8"
              >
                <span className="pt-1 font-plex-mono text-sm text-gold" aria-hidden="true">
                  {step.number}
                </span>
                <div>
                  <h3 className="font-plex-serif text-2xl sm:text-3xl">{step.title}</h3>
                  <p className="mt-3 max-w-xl leading-relaxed text-taupe">{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
