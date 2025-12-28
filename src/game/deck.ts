// src/game/deck.ts

import type { Card } from "../components/cards.js";   // 竊・縺薙％繧・type 莉倥″縺ｫ
import { generateDeck } from "../components/cards.js";
import type { Rng } from "./rng.js";

/** 繝輔ぅ繝・す繝｣繝ｼ窶薙う繧ｧ繝ｼ繝・〒繧ｷ繝｣繝・ヵ繝ｫ */
export function shuffle(deck: Card[], rng?: Rng): Card[] {
  const random = rng?.random ?? Math.random;
  const arr = [...deck];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** 譁ｰ縺励＞繧ｷ繝｣繝・ヵ繝ｫ貂医∩繝・ャ繧ｭ繧堤函謌・*/
export function createShuffledDeck(rng?: Rng): Card[] {
  return shuffle(generateDeck(), rng);
}

/** 謖・ｮ壻ｺｺ謨ｰ縺ｫ2譫壹★縺､繝上Φ繝峨ｒ驟阪ｋ・磯壼ｸｸ繝｢繝ｼ繝臥畑・・*/
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

