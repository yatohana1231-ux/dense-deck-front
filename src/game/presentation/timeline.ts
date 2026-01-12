import type { ActionLogEntry, TableState } from "../table.js";
import type { HandValue } from "../handEval.js";
import { HAND_CATEGORY_LABEL, compareHandValues, evaluateBestOfSeven } from "../handEval.js";

export const PRESENTATION_DELAYS = {
  actionMs: 1000,
  boardMs: 1000,
  showdownRevealMs: 1000,
  showdownResultMs: 2000,
};

export function actionLabel(entry: ActionLogEntry): string {
  const amt = entry.amount ?? 0;
  if ((entry.kind === "bet" || entry.kind === "raise") && entry.stackAfter === 0) {
    return amt > 0 ? `All-in ${amt}BB` : "All-in";
  }
  switch (entry.kind) {
    case "fold":
      return "Fold";
    case "check":
      return "Check";
    case "call":
      return amt > 0 ? `Call ${amt}BB` : "Call";
    case "bet":
      return amt > 0 ? `Bet ${amt}BB` : "Bet";
    case "raise":
      return amt > 0 ? `Raise ${amt}BB` : "Raise";
    default:
      return entry.kind;
  }
}

export function getHandDescription(value?: HandValue | null): string {
  if (!value) return "";
  const base = HAND_CATEGORY_LABEL[value.category];
  switch (value.category) {
    case "one-pair":
      return `${base} ${value.ranks[0]}`;
    case "two-pair":
      return value.ranks.length >= 2
        ? `${base} ${value.ranks[0]} and ${value.ranks[1]}`
        : base;
    case "three-of-a-kind":
    case "four-of-a-kind":
      return `${base} ${value.ranks[0]}`;
    default:
      return base;
  }
}

export function isShowdownStreet(table?: TableState | null): boolean {
  if (!table) return false;
  return table.street === "showdown" || table.revealStreet === "showdown";
}

export function computeShowdownInfo(table: TableState): {
  winners: number[];
  values: (ReturnType<typeof evaluateBestOfSeven> | null)[];
} {
  if (table.autoWin !== null) {
    return {
      winners: [table.autoWin],
      values: Array(table.game.players.length).fill(null),
    };
  }

  const board = [...table.game.flop, table.game.turn, table.game.river];
  if (board.length < 5) {
    return {
      winners: [],
      values: Array(table.game.players.length).fill(null),
    };
  }

  const values = table.game.players.map((p) => {
    if (p.folded) return null;
    return evaluateBestOfSeven(p.hand, board);
  });

  if (table.pots && table.pots.length > 0) {
    const winnersSet = new Set<number>();
    for (const pot of table.pots) {
      const eligible = pot.eligible.filter((idx) => values[idx]);
      if (eligible.length === 0) continue;
      let best = values[eligible[0]]!;
      let potWinners = [eligible[0]];
      for (let i = 1; i < eligible.length; i++) {
        const idx = eligible[i];
        const v = values[idx]!;
        const cmp = compareHandValues(v, best);
        if (cmp > 0) {
          best = v;
          potWinners = [idx];
        } else if (cmp === 0) {
          potWinners.push(idx);
        }
      }
      potWinners.forEach((idx) => winnersSet.add(idx));
    }
    return { winners: Array.from(winnersSet), values };
  }

  let best: ReturnType<typeof evaluateBestOfSeven> | null = null;
  let winners: number[] = [];
  table.game.players.forEach((p, idx) => {
    if (p.folded) return null;
    const v = evaluateBestOfSeven(p.hand, board);
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
