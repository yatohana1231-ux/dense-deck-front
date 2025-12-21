// src/game/deck.ts

import type { Card } from "../components/cards";   // ← ここを type 付きに
import { generateDeck } from "../components/cards";
import type { Rng } from "./rng";

/** フィッシャー–イェーツでシャッフル */
export function shuffle(deck: Card[], rng?: Rng): Card[] {
  const random = rng?.random ?? Math.random;
  const arr = [...deck];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** 新しいシャッフル済みデッキを生成 */
export function createShuffledDeck(rng?: Rng): Card[] {
  return shuffle(generateDeck(), rng);
}

/** 指定人数に2枚ずつハンドを配る（通常モード用） */
export function dealHands(
  deck: Card[],
  playerCount: number
): { hands: Card[][]; rest: Card[] } {
  const hands: Card[][] = [];
  let index = 0;

  for (let i = 0; i < playerCount; i++) {
    hands.push([deck[index], deck[index + 1]]);
    index += 2;
  }

  const rest = deck.slice(index);
  return { hands, rest };
}
