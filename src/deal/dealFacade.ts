import type { Card as CardType } from "../components/cards.js";
import {
  dealFromApi,
  type DealBoardResponse,
  type DealStreet,
  type Mode,
} from "../api/deal.js";
import { dealWeightedHandsIndependent } from "../game/dealing.js";
import { createShuffledDeck } from "../game/deck.js";
import type { Rng } from "../game/rng.js";

export type DealSource = "local" | "api";

type InitialDealResult = {
  handId: string;
  hands: CardType[][];
};

type RevealCardsResult = {
  handId: string;
  street: 1 | 2 | 3;
  flop: CardType[];
  turn: CardType[];
  river: CardType[];
};

type LocalDealState = {
  boardReserved: CardType[];
};

const localDeals = new Map<string, LocalDealState>();

function parseCardId(id: string): CardType {
  return { rank: id[0], suit: id[1] } as CardType;
}

function cardId(card: CardType): string {
  return `${card.rank}${card.suit}`;
}

function cardsEqual(a: CardType[], b: CardType[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((card, index) => cardId(card) === cardId(b[index]));
}

function parseBoardResponse(data: DealBoardResponse): RevealCardsResult {
  return {
    handId: data.handId,
    street: data.street,
    flop: data.flopcard.map(parseCardId),
    turn: data.turncard.map(parseCardId),
    river: data.rivercard.map(parseCardId),
  };
}

function validateRevealCards(
  result: RevealCardsResult,
  expectedStreet: 1 | 2 | 3,
  expectedFlop?: CardType[],
  expectedTurn?: CardType[]
) {
  if (result.street !== expectedStreet) {
    throw new Error(`revealStreetCardsFacade: street mismatch ${result.street} !== ${expectedStreet}`);
  }
  if (expectedStreet === 1) {
    if (result.flop.length !== 3 || result.turn.length !== 0 || result.river.length !== 0) {
      throw new Error("revealStreetCardsFacade: invalid flop response");
    }
    return;
  }
  if (expectedStreet === 2) {
    if (result.flop.length !== 3 || result.turn.length !== 1 || result.river.length !== 0) {
      throw new Error("revealStreetCardsFacade: invalid turn response");
    }
    if (expectedFlop && expectedFlop.length > 0 && !cardsEqual(result.flop, expectedFlop)) {
      throw new Error("revealStreetCardsFacade: flop mismatch");
    }
    return;
  }
  if (result.flop.length !== 3 || result.turn.length !== 1 || result.river.length !== 1) {
    throw new Error("revealStreetCardsFacade: invalid river response");
  }
  if (expectedFlop && expectedFlop.length > 0 && !cardsEqual(result.flop, expectedFlop)) {
    throw new Error("revealStreetCardsFacade: flop mismatch");
  }
  if (expectedTurn && expectedTurn.length > 0 && !cardsEqual(result.turn, expectedTurn)) {
    throw new Error("revealStreetCardsFacade: turn mismatch");
  }
}

export async function dealInitialHandsFacade(params: {
  source: DealSource;
  playerOrder: number[];
  mode: Mode;
  rng?: Rng;
}): Promise<InitialDealResult> {
  const { source, playerOrder, mode, rng } = params;

  if (source === "local") {
    const deck = createShuffledDeck(rng);
    const boardReserved = deck.slice(0, 10);
    const hands = dealWeightedHandsIndependent(playerOrder, boardReserved, mode);
    const handId = "local-" + Date.now().toString(36);
    localDeals.set(handId, { boardReserved });
    return { handId, hands };
  }

  const res = await dealFromApi({
    handId: "init",
    seatCount: playerOrder.length,
    playerOrder,
    mode,
    street: 0,
  });
  if (!("hands" in res)) {
    throw new Error("dealInitialHandsFacade: hands not returned from API");
  }
  return {
    handId: res.handId,
    hands: res.hands.map((hand) => hand.map(parseCardId)),
  };
}

export async function revealStreetCardsFacade(params: {
  source: DealSource;
  handId: string;
  playerOrder: number[];
  mode: Mode;
  street: 1 | 2 | 3;
  expectedFlop?: CardType[];
  expectedTurn?: CardType[];
}): Promise<RevealCardsResult> {
  const { source, handId, playerOrder, mode, street, expectedFlop, expectedTurn } = params;

  if (source === "local") {
    const deal = localDeals.get(handId);
    if (!deal) {
      throw new Error("revealStreetCardsFacade: local hand not found");
    }
    const flop = deal.boardReserved.slice(0, 3);
    const turn = deal.boardReserved[3] ? [deal.boardReserved[3]] : [];
    const river = deal.boardReserved[4] ? [deal.boardReserved[4]] : [];
    const result: RevealCardsResult =
      street === 1
        ? { handId, street, flop, turn: [], river: [] }
        : street === 2
          ? { handId, street, flop, turn, river: [] }
          : { handId, street, flop, turn, river };
    validateRevealCards(result, street, expectedFlop, expectedTurn);
    return result;
  }

  const res = await dealFromApi({
    handId,
    seatCount: playerOrder.length,
    playerOrder,
    mode,
    street: street as DealStreet,
  });
  if ("hands" in res) {
    throw new Error("revealStreetCardsFacade: board cards not returned from API");
  }
  const result = parseBoardResponse(res);
  validateRevealCards(result, street, expectedFlop, expectedTurn);
  return result;
}
