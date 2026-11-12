/*
 * What the reward layer can give (founder's reward layer, ported 2026-11-12 from
 * prototypes/quiz-modes/src/reward): six companions, each earned by a real milestone, and five
 * accessories, which come out of mystery boxes. Names and rules only; the drawings live in
 * src/components/rewards. Shared by the server and the client.
 */
import { MYSTERY_BOX_TOKENS } from "@/lib/student/progress";

export const ANIMAL_IDS = ["fox", "bunny", "cat", "owl", "bear", "wolf"] as const;
export type AnimalId = (typeof ANIMAL_IDS)[number];

export const ACCESSORY_IDS = ["glasses", "headphones", "cap", "bow", "scarf"] as const;
export type AccessoryId = (typeof ACCESSORY_IDS)[number];

/** Every student starts with the fox. */
export const STARTER: AnimalId = "fox";

/** `unlock` says how to earn it; `reason` says why it joined. */
export const ANIMALS: Record<AnimalId, { name: string; unlock: string; reason: string }> = {
  fox: { name: "Fox", unlock: "Your first companion", reason: "Your first companion" },
  bunny: {
    name: "Bunny",
    unlock: "Finish 7 Daily 10s in a row",
    reason: "For 7 Daily 10s in a row",
  },
  cat: { name: "Cat", unlock: "Conquer your first skill", reason: "For conquering a skill" },
  owl: {
    name: "Owl",
    unlock: "Finish a full-length practice test",
    reason: "For finishing a full-length practice test",
  },
  bear: { name: "Bear", unlock: "Answer 500 questions", reason: "For answering 500 questions" },
  wolf: {
    name: "Wolf pup",
    unlock: "Beat a Time Trial's pace",
    reason: "For beating a Time Trial's pace",
  },
};

export const ACCESSORIES: Record<AccessoryId, { name: string }> = {
  glasses: { name: "Round glasses" },
  headphones: { name: "Headphones" },
  cap: { name: "Graduation cap" },
  bow: { name: "Bow tie" },
  scarf: { name: "Star scarf" },
};

/** One mystery box costs this many tokens (the same 300 the Progress tab counts toward). */
export const BOX_COST = MYSTERY_BOX_TOKENS;

/**
 * [Founder to confirm] What a box gives once every accessory is owned: tokens back. 150 is a
 * placeholder (half a box), never money or a discount.
 */
export const BOX_BONUS_TOKENS = 150;

export const isAnimal = (v: unknown): v is AnimalId =>
  typeof v === "string" && (ANIMAL_IDS as readonly string[]).includes(v);
export const isAccessory = (v: unknown): v is AccessoryId =>
  typeof v === "string" && (ACCESSORY_IDS as readonly string[]).includes(v);
