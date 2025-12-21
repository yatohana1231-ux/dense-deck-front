// src/game/board.ts
import type { Card } from "./cards";

/**
 * 残りデッキからフロップ/ターン/リバーを生成する
 * burn はとりあえず考慮しないシンプル版
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
