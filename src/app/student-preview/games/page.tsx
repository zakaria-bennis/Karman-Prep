import DailyWordLab from "@/components/vocabulary/DailyWordLab";
import WordPartFlashcards from "@/components/vocabulary/WordPartFlashcards";
import s from "@/components/student/student.module.css";

export default function GamesPreview() {
  return (
    <div className={s.page} style={{ minWidth: 0 }}>
      <h1 className={s.h1}>Games</h1>
      <section aria-label="Wordline" style={{ minWidth: 0 }}>
        <DailyWordLab />
      </section>
      <section id="word-parts" aria-label="Word parts" style={{ minWidth: 0 }}>
        <WordPartFlashcards />
      </section>
    </div>
  );
}
