import type { Card as CardType } from "../../components/cards";
import type { HandValue } from "../handEval";
import { evaluateBestOfSeven, compareHandValues } from "../handEval";
import type { ActionLogEntry, TableState, Street } from "../table";

export type HandRecord = {
  handId: string;
  startedAt: number;
  endedAt: number;
  btnIndex: number;
  heroIndex: number;
  streetEnded: Street;
  autoWin: number | null;
  board: {
    flop: CardType[];
    turn: CardType;
    river: CardType;
  };
  boardReserved?: CardType[];
  seatCount?: number;
  holeCards: CardType[][];
  initialStacks: number[];
  finalStacks: number[];
  actionLog: ActionLogEntry[];
  winners: number[];
  handValues: (HandValue | null)[];
  pot: number;
};

function getWinners(table: TableState): { winners: number[]; values: (HandValue | null)[] } {
  if (table.autoWin !== null) {
    return {
      winners: [table.autoWin],
      values: Array(table.game.players.length).fill(null),
    };
  }

  const values: (HandValue | null)[] = [];
  let best: HandValue | null = null;
  let winners: number[] = [];
  const fullBoard = [...table.game.flop, table.game.turn, table.game.river];

  table.game.players.forEach((p, idx) => {
    if (p.folded) {
      values.push(null);
      return;
    }
    const v = evaluateBestOfSeven(p.hand, fullBoard);
    values.push(v);

    if (!best) {
      best = v;
      winners = [idx];
    } else {
      const cmp = compareHandValues(v, best);
      if (cmp > 0) {
        best = v;
        winners = [idx];
      } else if (cmp === 0) {
        winners.push(idx);
      }
    }
  });

  return { winners, values };
}

export function buildHandRecord(table: TableState, heroIndex = 2): HandRecord {
  const { winners, values } = getWinners(table);
  return {
    handId: table.handId,
    startedAt: table.handStartedAt,
    endedAt: Date.now(),
    btnIndex: table.btnIndex,
    heroIndex,
    streetEnded: table.street,
    autoWin: table.autoWin,
    board: {
      flop: table.game.flop,
      turn: table.game.turn,
      river: table.game.river,
    },
    boardReserved: table.boardReserved,
    seatCount: table.game.players.length,
    holeCards: table.game.players.map((p) => p.hand),
    initialStacks: table.initialStacks,
    finalStacks: table.game.players.map((p) => p.stack),
    actionLog: table.actionLog,
    winners,
    handValues: values,
    pot: table.game.pot,
  };
}

export async function saveHandRecord(record: HandRecord) {
  // Browser: fallback to localStorage.
  if (typeof window !== "undefined") {
    try {
      const key = "dense-deck-hand-history";
      const existing = window.localStorage.getItem(key);
      const parsed = existing ? JSON.parse(existing) : [];
      parsed.push(record);
      window.localStorage.setItem(key, JSON.stringify(parsed));
    } catch (e) {
      console.warn("Failed to persist hand record locally", e);
    }
    return;
  }

  // Node/SSR: optional file write (skipped in browser builds to avoid missing types).
  return;
}
