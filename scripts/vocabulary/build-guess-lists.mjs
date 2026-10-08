// Regenerate accepted guesses from the pinned, redistributable SCOWLv2
// en_US-large plain word list. Answers are separately reviewed content.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const sourceUrl =
  "https://raw.githubusercontent.com/en-wl/wordlist-diff/71d7dd07676edb60ade43552e10b41314b7e9287/en_US-large.txt";
const expectedSha256 = "fa1f9a1382df724be887d3a5d2d743095e6f33fc0949ebb22415c1554bb42fa7";
const sourcePath = process.argv[2];
if (!sourcePath) {
  throw new Error(`Download ${sourceUrl}, then pass its local path as the first argument`);
}
const source = readFileSync(sourcePath);
if (createHash("sha256").update(source).digest("hex") !== expectedSha256) {
  throw new Error("SCOWLv2 word-list bytes changed; review the source before regenerating");
}

const answers = [
  ...JSON.parse(readFileSync("src/data/vocabulary/verified-daily-words.json", "utf8")),
  ...JSON.parse(readFileSync("src/data/vocabulary/starter-daily-words.json", "utf8")),
];
const sourceWords = source.toString("utf8").split(/\r?\n/);
const notice =
  "# Copyright 2000-2026 by Kevin Atkinson\n# See /vocabulary/NOTICE.txt for the word-list license and source.\n";

for (let length = 5; length <= 15; length++) {
  const words = new Set(
    sourceWords.filter((word) => word.length === length && /^[a-z]+$/.test(word))
  );
  for (const answer of answers) {
    const spelling = answer.word.toLowerCase();
    if (spelling.length === length) words.add(spelling);
  }
  const output = `public/vocabulary/guesses-${length}.txt`;
  writeFileSync(output, `${notice}${[...words].sort().join(",")}\n`);
  console.log(`${length} letters: ${words.size} accepted spellings`);
}
