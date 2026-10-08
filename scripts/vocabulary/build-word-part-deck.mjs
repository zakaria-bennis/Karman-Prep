// Project the reviewed inventory into a smaller client deck. The full record,
// including provenance and caution metadata, remains in public/vocabulary.
import { readFileSync, writeFileSync } from "node:fs";
import prettier from "prettier";

const sourcePath = "public/vocabulary/reviewed-word-parts.json";
const outputPath = "src/data/vocabulary/word-part-cards.json";
const cards = JSON.parse(readFileSync(sourcePath, "utf8"));
const groups = new Set(["prefix", "suffix", "root"]);
const ids = new Set();
const fronts = new Map();

if (!Array.isArray(cards) || cards.length === 0) throw new Error("Expected reviewed cards");

for (const card of cards) {
  if (typeof card.id !== "string" || ids.has(card.id))
    throw new Error("Duplicate or missing card ID");
  ids.add(card.id);
  if (!groups.has(card.type) || typeof card.front !== "string" || !card.front.trim())
    throw new Error(`Invalid group or front: ${card.id}`);
  if (typeof card.back !== "string" || !card.back.trim() || card.back !== card.meaning)
    throw new Error(`Missing or mismatched meaning: ${card.id}`);
  if (!Array.isArray(card.variants) || !card.variants.every((value) => typeof value === "string"))
    throw new Error(`Invalid variants: ${card.id}`);
  if (!Array.isArray(card.same_front_card_ids)) throw new Error(`Missing sense IDs: ${card.id}`);
  if (card.caution != null && typeof card.caution !== "string")
    throw new Error(`Invalid caution: ${card.id}`);
  if (
    card.evidence?.status !== "source_checked" ||
    !Array.isArray(card.evidence.sources) ||
    !card.evidence.sources.length
  )
    throw new Error(`Missing reviewed sources: ${card.id}`);
  if (
    !card.evidence.sources.every(
      (source) => typeof source.url === "string" && source.url.startsWith("https://")
    )
  )
    throw new Error(`Invalid source URL: ${card.id}`);
  const key = `${card.type}:${card.front}`;
  fronts.set(key, [...(fronts.get(key) ?? []), card.id]);
}

for (const card of cards) {
  const expected = fronts.get(`${card.type}:${card.front}`).filter((id) => id !== card.id);
  if (JSON.stringify([...card.same_front_card_ids].sort()) !== JSON.stringify(expected.sort()))
    throw new Error(`Incorrect same-front sense links: ${card.id}`);
}

const deck = cards.map((card) => ({
  id: card.id,
  group: card.type,
  front: card.front,
  meaning: card.back,
  variants: card.variants,
  caution: card.caution,
  sameFrontCardIds: card.same_front_card_ids,
  sourceUrls: card.evidence.sources.map((source) => source.url),
}));

const options = await prettier.resolveConfig(outputPath);
writeFileSync(
  outputPath,
  await prettier.format(JSON.stringify(deck), { ...options, filepath: outputPath })
);
console.log(`Projected ${deck.length} reviewed word-part cards to ${outputPath}`);
