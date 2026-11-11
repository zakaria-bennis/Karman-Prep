// The universities shown on the home page. `logo` is the school's own logo, a transparent SVG in
// public/site/schools/ (from Wikimedia Commons; SOURCES.json there lists each file and its licence).

export interface School {
  name: string;
  logo: string;
  /**
   * How the logo is shown in dark mode. "white": a one-colour logo, turned white by the page. "file": its
   * own dark-mode file in public/site/schools/night/ (scripts/dev/night-logos.mjs makes them). Left out:
   * the logo's own colour already reads on dark, so it is shown as it is.
   */
  night?: "white" | "file";
  /** The school's name, written beside a logo that is only a letter, a crest or a nickname. */
  label?: string;
}

export const SCHOOLS: School[] = [
  { name: "Harvard", logo: "harvard", night: "file" },
  { name: "Stanford", logo: "stanford", night: "white" },
  { name: "MIT", logo: "mit", night: "white" },
  { name: "Princeton", logo: "princeton", night: "file" },
  { name: "Yale", logo: "yale", night: "white" },
  { name: "Columbia", logo: "columbia", night: "white" },
  { name: "Penn", logo: "penn", night: "white" },
  { name: "Caltech", logo: "caltech" },
  { name: "Duke", logo: "duke", night: "white" },
  { name: "Brown", logo: "brown", night: "white" },
  { name: "Northwestern", logo: "northwestern", night: "white" },
  { name: "Cornell", logo: "cornell", night: "white" },
  { name: "UChicago", logo: "uchicago", night: "white" },
  { name: "UC Berkeley", logo: "berkeley", night: "white" },
  { name: "UCLA", logo: "ucla", night: "white" },
  { name: "Dartmouth", logo: "dartmouth", night: "white" },
  { name: "Vanderbilt", logo: "vanderbilt", night: "white", label: "Vanderbilt University" },
  { name: "Notre Dame", logo: "notredame", night: "file", label: "University of Notre Dame" },
  { name: "Michigan", logo: "michigan", night: "file" },
  { name: "Georgetown", logo: "georgetown", night: "file" },
  { name: "Carnegie Mellon", logo: "cmu", night: "white" },
  { name: "Virginia", logo: "virginia", night: "white" },
  { name: "USC", logo: "usc", night: "white" },
  { name: "NYU", logo: "nyu", night: "file" },
  { name: "UNC", logo: "unc", night: "file", label: "UNC Chapel Hill" },
  { name: "Georgia Tech", logo: "gatech" },
  { name: "UT Austin", logo: "texas", label: "UT Austin" },
  { name: "Tufts", logo: "tufts" },
  { name: "Illinois", logo: "illinois", night: "file" },
  { name: "Florida", logo: "florida", night: "file" },
];

const BY_LOGO = new Map(SCHOOLS.map((s) => [s.logo, s]));
/** The school whose logo file is `logo`. */
export const schoolByLogo = (logo: string) => BY_LOGO.get(logo);
