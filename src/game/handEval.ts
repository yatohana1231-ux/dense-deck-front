// src/game/handEval.ts
import type { Card, Rank } from "../components/cards.js";

export type HandCategory =
  | "high-card"
  | "one-pair"
  | "two-pair"
  | "three-of-a-kind"
  | "straight"
  | "flush"
  | "full-house"
  | "four-of-a-kind"
  | "straight-flush";

export const HAND_CATEGORY_LABEL: Record<HandCategory, string> = {
  "high-card": "繝上う繧ｫ繝ｼ繝・,
  "one-pair": "繝ｯ繝ｳ繝壹い",
  "two-pair": "繝・・繝壹い",
  "three-of-a-kind": "繧ｹ繝ｪ繝ｼ繧ｫ繝ｼ繝・,
  "straight": "繧ｹ繝医Ξ繝ｼ繝・,
  "flush": "繝輔Λ繝・す繝･",
  "full-house": "繝輔Ν繝上え繧ｹ",
  "four-of-a-kind": "繝輔か繝ｼ繧ｫ繝ｼ繝・,
  "straight-flush": "繧ｹ繝医Ξ繝ｼ繝医ヵ繝ｩ繝・す繝･",
};

const rankOrder: Rank[] = [
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "T",
  "J",
  "Q",
  "K",
  "A",
];

const rankValue: Record<Rank, number> = Object.fromEntries(
  rankOrder.map((r, i) => [r, i])
) as Record<Rank, number>;

const categoryOrder: HandCategory[] = [
  "high-card",
  "one-pair",
  "two-pair",
  "three-of-a-kind",
  "straight",
  "flush",
  "full-house",
  "four-of-a-kind",
  "straight-flush",
];

const categoryIndex: Record<HandCategory, number> = Object.fromEntries(
  categoryOrder.map((c, i) => [c, i])
) as Record<HandCategory, number>;

export type HandValue = {
  category: HandCategory;
  categoryIndex: number;
  ranks: Rank[]; // 蠑ｷ縺墓ｯ碑ｼ・畑縺ｫ荳ｦ縺ｹ縺溘Λ繝ｳ繧ｯ
  cards: Card[]; // 螳滄圀縺ｫ菴ｿ繧上ｌ縺ｦ縺・ｋ5譫・
};

function sortRanksDesc(ranks: Rank[]): Rank[] {
  return [...ranks].sort((a, b) => rankValue[b] - rankValue[a]);
}

/**
 * 荳弱∴繧峨ｌ縺・譫壹・繧ｫ繝ｼ繝峨ｒ隧穂ｾ｡
 */
export function evaluate5(cards: Card[]): HandValue {
  if (cards.length !== 5) {
    throw new Error("evaluate5 expects exactly 5 cards");
  }

  const suits = cards.map((c) => c.suit);
  const ranks = cards.map((c) => c.rank);

  const isFlush = suits.every((s) => s === suits[0]);

  // 繝ｩ繝ｳ繧ｯ蜃ｺ迴ｾ蝗樊焚繧ｫ繧ｦ繝ｳ繝・
  const countByRank = new Map<Rank, number>();
  for (const r of ranks) {
    countByRank.set(r, (countByRank.get(r) ?? 0) + 1);
  }

  const uniqueRanks = Array.from(countByRank.keys());
  const uniqueRanksSortedAsc = [...uniqueRanks].sort(
    (a, b) => rankValue[a] - rankValue[b]
  );

  // 繧ｹ繝医Ξ繝ｼ繝亥愛螳夲ｼ・2345 縺ｮ繝帙う繝ｼ繝ｫ繧ょｯｾ蠢懶ｼ・
  let isStraight = false;
  let straightHigh: Rank | null = null;

  if (uniqueRanksSortedAsc.length === 5) {
    let consecutive = true;
    for (let i = 0; i < 4; i++) {
      if (
        rankValue[uniqueRanksSortedAsc[i + 1]] -
          rankValue[uniqueRanksSortedAsc[i]] !==
        1
      ) {
        consecutive = false;
        break;
      }
    }
    if (consecutive) {
      isStraight = true;
      straightHigh = uniqueRanksSortedAsc[4];
    } else {
      // A2345 (2,3,4,5,A)
      const wheel = ["A", "2", "3", "4", "5"] as Rank[];
      const isWheel =
        wheel.every((r) => uniqueRanks.includes(r)) &&
        uniqueRanksSortedAsc.length === 5;
      if (isWheel) {
        isStraight = true;
        straightHigh = "5";
      }
    }
  }

  // 蜃ｺ迴ｾ蝗樊焚蛻･縺ｫ繝ｩ繝ｳ繧ｯ繧貞・鬘・
  const singles: Rank[] = [];
  const pairs: Rank[] = [];
  const trips: Rank[] = [];
  const quads: Rank[] = [];

  for (const r of uniqueRanks) {
    const count = countByRank.get(r)!;
    if (count === 4) quads.push(r);
    else if (count === 3) trips.push(r);
    else if (count === 2) pairs.push(r);
    else singles.push(r);
  }

  const singlesDesc = sortRanksDesc(singles);
  const pairsDesc = sortRanksDesc(pairs);
  const tripsDesc = sortRanksDesc(trips);
  const quadsDesc = sortRanksDesc(quads);

  // 蠖ｹ蛻､螳・

  // 1) 繧ｹ繝医Ξ繝ｼ繝医ヵ繝ｩ繝・す繝･
  if (isStraight && isFlush && straightHigh) {
    return {
      category: "straight-flush",
      categoryIndex: categoryIndex["straight-flush"],
      ranks: [straightHigh],
      cards,
    };
  }

  // 2) 繝輔か繝ｼ繧ｫ繝ｼ繝・
  if (quadsDesc.length === 1) {
    const quadRank = quadsDesc[0];
    const kicker = singlesDesc[0];
    return {
      category: "four-of-a-kind",
      categoryIndex: categoryIndex["four-of-a-kind"],
      ranks: [quadRank, kicker],
      cards,
    };
  }

  // 3) 繝輔Ν繝上え繧ｹ・・+2 or 3+3・・
  if (tripsDesc.length >= 1 && (pairsDesc.length >= 1 || tripsDesc.length >= 2)) {
    const tripRank = tripsDesc[0];
    const pairRank =
      pairsDesc[0] ?? tripsDesc[1]; // 3+3+X 縺ｮ縺ｨ縺阪・2縺､逶ｮ縺ｮ3繧偵・繧｢謇ｱ縺・
    return {
      category: "full-house",
      categoryIndex: categoryIndex["full-house"],
      ranks: [tripRank, pairRank],
      cards,
    };
  }

  // 4) 繝輔Λ繝・す繝･
  if (isFlush) {
    const sortedFlush = sortRanksDesc(ranks);
    return {
      category: "flush",
      categoryIndex: categoryIndex["flush"],
      ranks: sortedFlush,
      cards,
    };
  }

  // 5) 繧ｹ繝医Ξ繝ｼ繝・
  if (isStraight && straightHigh) {
    return {
      category: "straight",
      categoryIndex: categoryIndex["straight"],
      ranks: [straightHigh],
      cards,
    };
  }

  // 6) 繧ｹ繝ｪ繝ｼ繧ｫ繝ｼ繝・
  if (tripsDesc.length === 1) {
    const tripRank = tripsDesc[0];
    const kickers = singlesDesc.slice(0, 2);
    return {
      category: "three-of-a-kind",
      categoryIndex: categoryIndex["three-of-a-kind"],
      ranks: [tripRank, ...kickers],
      cards,
    };
  }

  // 7) 繝・・繝壹い
  if (pairsDesc.length >= 2) {
    const topTwo = pairsDesc.slice(0, 2); // 蠑ｷ縺・縺､
    const kicker = singlesDesc[0];
    return {
      category: "two-pair",
      categoryIndex: categoryIndex["two-pair"],
      ranks: [...topTwo, kicker],
      cards,
    };
  }

  // 8) 繝ｯ繝ｳ繝壹い
  if (pairsDesc.length === 1) {
    const pairRank = pairsDesc[0];
    const kickers = singlesDesc.slice(0, 3);
    return {
      category: "one-pair",
      categoryIndex: categoryIndex["one-pair"],
      ranks: [pairRank, ...kickers],
      cards,
    };
  }

  // 9) 繝上う繧ｫ繝ｼ繝・
  const highCards = sortRanksDesc(ranks);
  return {
    category: "high-card",
    categoryIndex: categoryIndex["high-card"],
    ranks: highCards,
    cards,
  };
}

/**
 * 蠖ｹ縺ｮ蠑ｷ縺墓ｯ碑ｼ・ｼ・ > b 縺ｪ繧画ｭ｣縲∥ < b 縺ｪ繧芽ｲ縲∝酔縺倥↑繧・・・
 */
export function compareHandValues(a: HandValue, b: HandValue): number {
  if (a.categoryIndex !== b.categoryIndex) {
    return a.categoryIndex - b.categoryIndex;
  }
  const len = Math.max(a.ranks.length, b.ranks.length);
  for (let i = 0; i < len; i++) {
    const ra = a.ranks[i];
    const rb = b.ranks[i];
    if (!ra || !rb) break;
    if (ra === rb) continue;
    return rankValue[ra] - rankValue[rb];
  }
  return 0;
}

/**
 * 繝帙・繝ｫ繧ｫ繝ｼ繝・譫・+ 繝懊・繝会ｼ域怙螟ｧ5譫夲ｼ峨°繧画怙蠑ｷ縺ｮ5譫壼ｽｹ繧定ｿ斐☆
 */
export function evaluateBestOfSeven(
  holeCards: Card[],
  board: Card[]
): HandValue {
  const all = [...holeCards, ...board];
  if (all.length < 5 || all.length > 7) {
    throw new Error("evaluateBestOfSeven expects 5縲・ cards total");
  }

  // 5譫壹■繧・≧縺ｩ縺ｪ繧峨◎縺ｮ縺ｾ縺ｾ隧穂ｾ｡
  if (all.length === 5) {
    return evaluate5(all);
  }

  // 7譫壹・蝣ｴ蜷医・ 7C5=21 騾壹ｊ縺ｮ5譫壹ｒ蜈ｨ謗｢邏｢
  let best: HandValue | null = null;

  for (let i = 0; i < all.length - 4; i++) {
    for (let j = i + 1; j < all.length - 3; j++) {
      for (let k = j + 1; k < all.length - 2; k++) {
        for (let l = k + 1; l < all.length - 1; l++) {
          for (let m = l + 1; m < all.length; m++) {
            const five = [all[i], all[j], all[k], all[l], all[m]];
            const v = evaluate5(five);
            if (!best || compareHandValues(v, best) > 0) {
              best = v;
            }
          }
        }
      }
    }
  }

  if (!best) {
    throw new Error("Failed to evaluate hand");
  }
  return best;
}

