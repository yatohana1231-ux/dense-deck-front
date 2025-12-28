// src/game/board.ts
import type { Card } from "./cards.js";

/**
 * 谿九ｊ繝・ャ繧ｭ縺九ｉ繝輔Ο繝・・/繧ｿ繝ｼ繝ｳ/繝ｪ繝舌・繧堤函謌舌☆繧・
 * burn 縺ｯ縺ｨ繧翫≠縺医★閠・・縺励↑縺・す繝ｳ繝励Ν迚・
 */
export function dealBoard(deck: Card[]): {
  flop: Card[];
  turn: Card;
  river: Card;
  rest: Card[];
} {
  if (deck.length < 5) {
    throw new Error("Not enough cards to deal board");
  }

  const flop = deck.slice(0, 3);
  const turn = deck[3];
  const river = deck[4];
  const rest = deck.slice(5);

  return { flop, turn, river, rest };
}

