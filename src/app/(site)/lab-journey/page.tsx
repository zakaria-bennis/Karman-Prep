// TEMPORARY: a storyboard of routes for the home page's background, painted with the real painter.
import Board, { type Stop } from "./Board";

export const metadata = { robots: { index: false }, title: "Background storyboard (temporary)" };

const S = (scene: number, time: Stop["time"], name: string, sky = false): Stop => ({
  scene,
  time,
  name,
  sky,
});

const ROUTES = [
  {
    title: "A. Summit to shore",
    note: "Start high in the dawn sky, come down over the peaks, past the waterfall and the mountain lake, through the pines and the valley, out across the meadow, and end on the shore as night sets. Seven scenes, the biggest change of terrain.",
    stops: [
      S(7, "dawn", "1. The open sky", true),
      S(7, "dawn", "2. Twin peaks"),
      S(6, "day", "3. The waterfall"),
      S(0, "day", "4. Mountain lake"),
      S(9, "day", "5. Pine path"),
      S(5, "sunset", "6. The old oak meadow"),
      S(4, "night", "7. The shore"),
    ],
  },
  {
    title: "B. Follow the water",
    note: "One thread the whole way: the same water. Glacier lake, waterfall, river through the valley, autumn lake, marsh, and the sea. Six scenes, calmer and more of one piece.",
    stops: [
      S(7, "dawn", "1. The open sky", true),
      S(7, "dawn", "2. Glacier lake"),
      S(6, "day", "3. The waterfall"),
      S(1, "day", "4. River in the valley"),
      S(3, "sunset", "5. Autumn lake"),
      S(8, "sunset", "6. The marsh"),
      S(4, "night", "7. The sea"),
    ],
  },
  {
    title: "C. Through the year",
    note: "Four scenes, one per season, so the page also travels in time: spring birches, the summer oak, the autumn lake, the winter cabin at night. Fewer scenes, each held longer.",
    stops: [
      S(8, "dawn", "1. The open sky", true),
      S(8, "dawn", "2. Spring birches"),
      S(5, "day", "3. Summer oak"),
      S(3, "sunset", "4. Autumn lake"),
      S(2, "night", "5. Winter cabin"),
    ],
  },
  {
    title: "Dark mode: route A, run the other way round the clock",
    note: "The same seven places. It opens just after sunset, travels through the night, and the sun comes up at the end.",
    dark: true,
    stops: [
      S(7, "sunset", "1. The dusk sky", true),
      S(7, "sunset", "2. Twin peaks"),
      S(6, "night", "3. The waterfall"),
      S(0, "night", "4. Mountain lake"),
      S(9, "night", "5. Pine path"),
      S(5, "night", "6. The old oak meadow"),
      S(4, "dawn", "7. The shore"),
    ],
  },
];

export default function LabJourney() {
  return (
    <main
      style={{
        padding: "40px 28px 80px",
        background: "#e9e2ee",
        minHeight: "100vh",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1 style={{ fontSize: 44, margin: "0 0 8px" }}>
        The background: three routes down from the sky
      </h1>
      <p style={{ maxWidth: 820, fontSize: 18, margin: "0 0 36px" }}>
        Every picture here is painted by Karman&apos;s own painter, the one already behind the page.
        Today the page shows one place in four lights. Each route below is a string of different
        places the page would travel through as you scroll.
      </p>
      <Board routes={ROUTES} />
    </main>
  );
}
