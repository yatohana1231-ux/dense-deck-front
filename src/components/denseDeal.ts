// src/game/denseDeal.ts

import type { Card } from "./cards.js";
import { createShuffledDeck } from "../game/deck.js";
import { isAllowedHand } from "../game/allowed.js"

/** Dense Deck 用�E�許可されたハンドが出るまで2枚を引き直ぁE*/
export function dealDenseHand(deck: Card[]): { hand: Card[]; rest: Card[] } {
  let rest = [...deck];

  while (rest.length >= 2) {
    const [c1, c2, ...next] = rest;

    if (isAllowedHand(c1, c2)) {
      return {
        hand: [c1, c2],
        rest: next,
      };
    }

    rest = next;
  }

  throw new Error("No allowed hands left in the deck!");
}

/** 持E��人数ぶん、Dense Deck ルールでハンドを配る */
export function dealDenseHands(playerCount: number) {
  let deck = createShuffledDeck();
  const hands: Card[][] = [];

  for (let i = 0; i < playerCount; i++) {
    const { hand, rest } = dealDenseHand(deck);
    hands.push(hand);
    deck = rest;
  }

  return { hands, deck };
}

