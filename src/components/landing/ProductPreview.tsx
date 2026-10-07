import Image from "next/image";

export default function ProductPreview() {
  return (
    <section className="border-t border-bronze bg-surface px-5 py-20 text-ivory md:px-8 md:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="mb-9 max-w-2xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-gold">
            Inside Karman
          </p>
          <h2 className="font-plex-serif text-4xl leading-tight sm:text-5xl">
            A clear place to pick up your practice.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-taupe">
            The study desk brings lessons, saved answers, and support links together. What appears
            depends on your access and saved work.
          </p>
        </div>
        <figure>
          <div className="overflow-hidden border border-bronze bg-night p-2 shadow-[0_24px_50px_-36px_rgba(0,0,0,0.35)] sm:p-4">
            <Image
              src="/images/study-desk-local-preview.png"
              alt="Local preview of the Karman study desk showing a new student's lesson links, skill areas, and support links"
              width={1440}
              height={1414}
              sizes="(max-width: 768px) 100vw, 1152px"
              className="h-auto w-full"
            />
          </div>
          <figcaption className="mt-4 text-sm leading-relaxed text-taupe">
            Local product preview using sample saved status. Your study desk will reflect your own
            access and work.
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
