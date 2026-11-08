// A real screen from the Karman portal, captured from the app itself (founder, 8 November: the site shows the
// product only through real portal screens, never drawn ones). The captures live in public/site/portal/;
// a phone capture comes in the site's light and dark mode and follows the page's own switch (film.css).
// Put it inside the code-drawn iPhone (parts.tsx Phone) or the laptop frame (.mbp, calendar.css).
export type PortalScreen = "today" | "library" | "progress" | "daily-end" | "parent-week";

export default function PortalShot({
  screen,
  device,
  alt,
  modes = ["dark", "light"],
}: {
  screen: PortalScreen;
  device: "phone" | "desk";
  alt: string;
  /** The captures that exist for this screen. One mode is shown in both of the page's modes. */
  modes?: ("dark" | "light")[];
}) {
  const [w, h] = device === "phone" ? [880, 1912] : [1440, 900];
  return (
    <span className={`pshot ${device}`}>
      {modes.map((m, k) => (
        <img
          key={m}
          className={modes.length > 1 ? `ps-${m}` : undefined}
          src={`/site/portal/${screen}-${device}-${m}.webp`}
          alt={k === 0 ? alt : ""}
          aria-hidden={k === 0 ? undefined : true}
          width={w}
          height={h}
          loading="lazy"
          decoding="async"
        />
      ))}
    </span>
  );
}
