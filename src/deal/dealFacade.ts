import type { Card as CardType } from "../components/cards.js";
import { dealWeightedHandsIndependent } from "../game/dealing.js";
import { dealFromApi, type Mode } from "../api/deal.js";
import { createShuffledDeck } from "../game/deck.js";
import type { Rng } from "../game/rng.js";

export type DealSource = "local" | "api";

function parseCardId(id: string): CardType {
  // id is like "As", "Td" (rank + suit)
  return { rank: id[0], suit: id[1] } as CardType;
}

type DealResult = { handId: string; hands: CardType[][]; boardReserved: CardType[] };

export async function dealHandsFacade(params: {
  source: DealSource;
  playerOrder: number[];
  mode: Mode;
  rng?: Rng;
}): Promise<DealResult> {
  const { source, playerOrder, mode, rng } = params;

  if (source === "local") {
    const deck = createShuffledDeck(rng);
    const boardReserved = deck.slice(0, 10);
    const hands = dealWeightedHandsIndependent(playerOrder, boardReserved, mode);
    return {
      handId: "local-" + Date.now().toString(36),
      hands,
      boardReserved,
    };
  }

  const res = await dealFromApi({ playerOrder, mode });
  const parsedHands = res.hands.map((hand) => hand.map(parseCardId));
  let parsedBoard: CardType[];

  if (Array.isArray(res.boardReserved) && res.boardReserved.length >= 5) {
    parsedBoard = res.boardReserved.map(parseCardId);
  } else {
    // Fallback: build boardReserved locally from remaining deck to keep the game running.
    const used = new Set(parsedHands.flat().map((c) => `${c.rank}${c.suit}`));
    const deck = createShuffledDeck(rng);
    parsedBoard = [];
    for (const c of deck) {
      const id = `${c.rank}${c.suit}`;
      if (used.has(id)) continue;
      parsedBoard.push(c);
      if (parsedBoard.length === 10) break;
    }
    if (parsedBoard.length < 5) {
      throw new Error("dealHandsFacade: failed to build fallback boardReserved");
    }
  }

  return {
    handId: res.handId,
    hands: parsedHands,
    boardReserved: parsedBoard,
  };
}

