import rawWeights from "./weightDense.json";
import { generateDeck } from "../components/cards.js";
import type { Card as CardType } from "../components/cards.js";
import { getHandClass } from "./getHandClass.js";
import type { Rng } from "./rng.js";

type WeightEntry =
  | number
  | {
      superDense?: number;
      dense?: number;
    };

const allowedWeights = rawWeights as Record<string, WeightEntry>;
const MAX_RETRY = 128;

function cardId(c: CardType): string {
  return `${c.rank}${c.suit}`;
}

export function generateHandId(random: () => number = Math.random): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return random().toString(36).slice(2, 10);
}

function getWeight(
  classKey: string,
  mode: "superDense" | "dense" = "superDense"
): number {
  const entry = allowedWeights[classKey];
  if (entry === undefined) return 0;
  if (typeof entry === "number") return entry;
  const key = mode === "superDense" ? "superDense" : "dense";
  const val = entry[key];
  return typeof val === "number" ? val : 0;
}

type ComboPrep = {
  combosByClass: Map<string, CardType[][]>;
  weightedKeys: { key: string; effectiveWeight: number }[];
  totalWeight: number;
};

function buildCombosAndWeights(
  mode: "superDense" | "dense" = "superDense"
): ComboPrep {
  const deck = generateDeck();
  const combosByClass = new Map<string, CardType[][]>();

  for (let i = 0; i < deck.length; i++) {
    for (let j = i + 1; j < deck.length; j++) {
      const c1 = deck[i];
      const c2 = deck[j];
      const key = getHandClass(c1, c2);
      const arr = combosByClass.get(key) ?? [];
      arr.push([c1, c2]);
      combosByClass.set(key, arr);
    }
  }

  const weightedKeys: { key: string; effectiveWeight: number }[] = [];
  let totalWeight = 0;
  for (const [key, combos] of combosByClass.entries()) {
    const w = getWeight(key, mode);
    if (w <= 0 || combos.length === 0) continue;
    const eff = w * combos.length; // weight * combos count
    weightedKeys.push({ key, effectiveWeight: eff });
    totalWeight += eff;
  }

  return { combosByClass, weightedKeys, totalWeight };
}

function drawClassKey(prep: ComboPrep, random: () => number = Math.random): string {
  let r = random() * prep.totalWeight;
  for (const { key, effectiveWeight } of prep.weightedKeys) {
    if (r < effectiveWeight) return key;
    r -= effectiveWeight;
  }
  return prep.weightedKeys[prep.weightedKeys.length - 1].key;
}

export function dealWeightedHandsIndependent(
  playerOrder: number[],
  boardReserved: CardType[],
  mode: "superDense" | "dense" = "superDense",
  rng?: Rng
): CardType[][] {
  const random = rng?.random ?? Math.random;
  const prep = buildCombosAndWeights(mode);
  if (prep.weightedKeys.length === 0 || prep.totalWeight <= 0) {
    throw new Error("No weighted classes available for dealing");
  }

  for (let attempt = 0; attempt < MAX_RETRY; attempt++) {
    const hands: CardType[][] = Array(playerOrder.length).fill(null) as any;
    const used = new Set<string>();
    let conflict = false;

    // reserve board cards first
    for (const c of boardReserved) {
      used.add(cardId(c));
    }

    for (const seat of playerOrder) {
      const classKey = drawClassKey(prep, random);
      const combos = prep.combosByClass.get(classKey);
      if (!combos || combos.length === 0) {
        conflict = true;
        break;
      }
      const combo = combos[Math.floor(random() * combos.length)];

      const ids = combo.map(cardId);
      if (ids.some((id) => used.has(id))) {
        conflict = true;
        break;
      }

      ids.forEach((id) => used.add(id));
      hands[seat] = combo;
    }

    if (!conflict && hands.every((h) => Array.isArray(h))) {
      return hands;
    }
  }

  throw new Error("Failed to deal weighted hands after retries");
}

