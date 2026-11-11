// One school's logo, for light and for dark mode. Most logos are a single dark colour: at night the page
// turns those white (painted.css, .logo-white). A few carry two colours or a shield and have their own
// dark-mode file; the two pictures swap with the page's mode, and only the one on show is fetched.
import type { School } from "@/lib/marketing/schools";

export default function SchoolLogo({ school, alt = "" }: { school: School; alt?: string }) {
  const day = `/site/schools/${school.logo}.svg`;
  if (school.night !== "file")
    return (
      // eslint-disable-next-line @next/next/no-img-element -- small static SVG logos
      <img
        className={school.night === "white" ? "logo-white" : undefined}
        src={day}
        alt={alt}
        decoding="async"
        draggable={false}
      />
    );
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- small static SVG logos */}
      <img className="logo-day" src={day} alt={alt} decoding="async" draggable={false} />
      {/* eslint-disable-next-line @next/next/no-img-element -- small static SVG logos */}
      <img
        className="logo-night"
        src={`/site/schools/night/${school.logo}.svg`}
        alt={alt}
        loading="lazy"
        decoding="async"
        draggable={false}
      />
    </>
  );
}
