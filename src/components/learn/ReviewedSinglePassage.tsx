import MathText from "./MathText";
import type { ReviewedPassageDisplay } from "@/lib/question-bank/reviewed-passage";

export default function ReviewedSinglePassage({
  intro,
  passage,
  display,
  treatBlankWord = false,
}: {
  intro?: string | null;
  passage?: string | null;
  display?: ReviewedPassageDisplay;
  treatBlankWord?: boolean;
}) {
  if (display) {
    return (
      <section aria-label="Reading passage" className="space-y-4">
        <p data-passage-part="introduction">
          <MathText text={display.intro} />
        </p>
        <p data-passage-part="excerpt" className="indent-4">
          <MathText text={display.excerpt} className="whitespace-pre-wrap" />
        </p>
        <p data-passage-part="copyright" className="text-right text-sm leading-relaxed">
          <MathText text={display.copyright} />
        </p>
      </section>
    );
  }
  return (
    <>
      {intro && (
        <p className="mb-5">
          <MathText text={intro} />
        </p>
      )}
      {passage && (
        <MathText
          text={passage}
          className="block whitespace-pre-wrap"
          treatBlankWord={treatBlankWord}
        />
      )}
    </>
  );
}
