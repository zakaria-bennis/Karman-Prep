import DailyWordLab from "@/components/vocabulary/DailyWordLab";
import WordPartFlashcards from "@/components/vocabulary/WordPartFlashcards";
import s from "@/components/student/student.module.css";

export default function GamesPreview() {
  return (
    <div className={s.page}>
      <h1 className={s.h1}>Games</h1>
      <section className={s.panel} aria-label="Wordline">
        <DailyWordLab />
      </section>
      <section id="word-parts" className={s.panel} aria-label="Word parts">
        <WordPartFlashcards />
      </section>
    </div>
  );
}
