// The answer set is deliberately much smaller than the accepted-guess lexicon.
// Pin the existing macOS web2 input so regeneration cannot silently change it.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const dictionaryPath = process.argv[2] ?? "/usr/share/dict/words";
const expectedSha256 = "be41ad97963bf8dabedd5871d5d691596175269d540956b0f9965a885c2bbab9";
const dictionary = readFileSync(dictionaryPath);
if (createHash("sha256").update(dictionary).digest("hex") !== expectedSha256)
  throw new Error("Guess dictionary bytes changed; review before regenerating lists");

const answers = JSON.parse(readFileSync("src/data/vocabulary/verified-daily-words.json", "utf8"));
const dictionaryWords = dictionary.toString("utf8").split(/\r?\n/);
for (let length = 9; length <= 15; length++) {
  const words = new Set(
    dictionaryWords.filter((word) => word.length === length && /^[a-z]+$/.test(word))
  );
  for (const answer of answers) {
    const spelling = answer.word.toLowerCase();
    if (spelling.length === length) words.add(spelling);
  }
  const output = `public/vocabulary/guesses-${length}.txt`;
  writeFileSync(output, `${[...words].sort().join(",")}\n`);
  console.log(`${length} letters: ${words.size} accepted spellings`);
}
