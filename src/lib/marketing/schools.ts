// The universities shown on the home page. `logo` is the school's own logo, a transparent SVG in
// public/site/schools/ (from Wikimedia Commons; SOURCES.json there lists each file and its licence).

export interface School {
  name: string;
  logo: string;
}

export const SCHOOLS: School[] = [
  { name: "Harvard", logo: "harvard" },
  { name: "Stanford", logo: "stanford" },
  { name: "MIT", logo: "mit" },
  { name: "Princeton", logo: "princeton" },
  { name: "Yale", logo: "yale" },
  { name: "Columbia", logo: "columbia" },
  { name: "Penn", logo: "penn" },
  { name: "Caltech", logo: "caltech" },
  { name: "Duke", logo: "duke" },
  { name: "Brown", logo: "brown" },
  { name: "Northwestern", logo: "northwestern" },
  { name: "Cornell", logo: "cornell" },
  { name: "UChicago", logo: "uchicago" },
  { name: "UC Berkeley", logo: "berkeley" },
  { name: "UCLA", logo: "ucla" },
  { name: "Dartmouth", logo: "dartmouth" },
  { name: "Vanderbilt", logo: "vanderbilt" },
  { name: "Notre Dame", logo: "notredame" },
  { name: "Michigan", logo: "michigan" },
  { name: "Georgetown", logo: "georgetown" },
  { name: "Carnegie Mellon", logo: "cmu" },
  { name: "Virginia", logo: "virginia" },
  { name: "USC", logo: "usc" },
  { name: "NYU", logo: "nyu" },
  { name: "UNC", logo: "unc" },
  { name: "Georgia Tech", logo: "gatech" },
  { name: "UT Austin", logo: "texas" },
  { name: "Tufts", logo: "tufts" },
  { name: "Illinois", logo: "illinois" },
  { name: "Florida", logo: "florida" },
];
