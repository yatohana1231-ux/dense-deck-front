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
  "high-card": "High Card",
  "one-pair": "A Pair",
  "two-pair": "Two Pair",
  "three-of-a-kind": "Three Cards",
  "straight": "Straight",
  "flush": "Flush",
  "full-house": "Full House",
  "four-of-a-kind": "Quads",
  "straight-flush": "Straight Flush",
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
  ranks: Rank[];
  cards: Card[];
};

function sortRanksDesc(ranks: Rank[]): Rank[] {
  return [...ranks].sort((a, b) => rankValue[b] - rankValue[a]);
}

/**
 * 与えられた5枚のカードを評価
 */
export function evaluate5(cards: Card[]): HandValue {
  if (cards.length !== 5) {
    throw new Error("evaluate5 expects exactly 5 cards");
  }

  const suits = cards.map((c) => c.suit);
  const ranks = cards.map((c) => c.rank);

  const isFlush = suits.every((s) => s === suits[0]);

  // ランク出現回数カウント
  const countByRank = new Map<Rank, number>();
  for (const r of ranks) {
    countByRank.set(r, (countByRank.get(r) ?? 0) + 1);
  }

  const uniqueRanks = Array.from(countByRank.keys());
  const uniqueRanksSortedAsc = [...uniqueRanks].sort(
    (a, b) => rankValue[a] - rankValue[b]
  );

  // ストレート判定（A2345 のホイールも対応）
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

  // 出現回数別にランクを分類
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

  // 役判定

  // 1) ストレートフラッシュ
  if (isStraight && isFlush && straightHigh) {
    return {
      category: "straight-flush",
      categoryIndex: categoryIndex["straight-flush"],
      ranks: [straightHigh],
      cards,
    };
  }

  // 2) フォーカード
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

  // 3) フルハウス（3+2 or 3+3）
  if (tripsDesc.length >= 1 && (pairsDesc.length >= 1 || tripsDesc.length >= 2)) {
    const tripRank = tripsDesc[0];
    const pairRank =
      pairsDesc[0] ?? tripsDesc[1]; // 3+3+X のときは2つ目の3をペア扱い
    return {
      category: "full-house",
      categoryIndex: categoryIndex["full-house"],
      ranks: [tripRank, pairRank],
      cards,
    };
  }

  // 4) フラッシュ
  if (isFlush) {
    const sortedFlush = sortRanksDesc(ranks);
    return {
      category: "flush",
      categoryIndex: categoryIndex["flush"],
      ranks: sortedFlush,
      cards,
    };
  }

  // 5) ストレート
  if (isStraight && straightHigh) {
    return {
      category: "straight",
      categoryIndex: categoryIndex["straight"],
      ranks: [straightHigh],
      cards,
    };
  }

  // 6) スリーカード
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

  // 7) ツーペア
  if (pairsDesc.length >= 2) {
    const topTwo = pairsDesc.slice(0, 2); // 強い2つ
    const kicker = singlesDesc[0];
    return {
      category: "two-pair",
      categoryIndex: categoryIndex["two-pair"],
      ranks: [...topTwo, kicker],
      cards,
    };
  }

  // 8) ワンペア
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

  // 9) ハイカード
  const highCards = sortRanksDesc(ranks);
  return {
    category: "high-card",
    categoryIndex: categoryIndex["high-card"],
    ranks: highCards,
    cards,
  };
}

/**
 * 役の強さ比較。a > b なら正、a < b なら負、同じなら 0
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
 * ホールカード2枚 + ボード（最大5枚）から最強の5枚役を返す
 */
export function evaluateBestOfSeven(
  holeCards: Card[],
  board: Card[]
): HandValue {
  const all = [...holeCards, ...board];
  if (all.length < 5 || all.length > 7) {
    throw new Error("evaluateBestOfSeven expects 5-7 cards total");
  }

  // 5枚ちょうどならそのまま評価
  if (all.length === 5) {
    return evaluate5(all);
  }

  // 7枚の場合は 7C5=21 通りの5枚を全探索
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
