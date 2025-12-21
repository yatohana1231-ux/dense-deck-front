import {
  type Street,
  type ActionKind,
  type PlayerState,
  type GameState,
  type TableState,
  type PendingAction,
} from "./types";
import {
  getPositions,
  getPreflopOrder,
  getPostflopOrder,
} from "./positions";
import { pickAiAction, getLegalActions as getLegalActionsImpl } from "./ai";
import type { Rng } from "./rng";
import { defaultRng } from "./rng";
import { dealHandsFacade } from "../deal/dealFacade"

export type {
  Street,
  ActionKind,
  PlayerState,
  GameState,
  TableState,
  PendingAction,
  ActionLogEntry,
} from "./types";

function findFirstActiveInOrder(order: number[], players: PlayerState[]): number {
  for (const seat of order) {
    const p = players[seat];
    if (p && !p.folded && !p.allIn) return seat;
  }
  return order[0] ?? 0;
}

function nextStreet(street: Street): Street {
  if (street === "preflop") return "flop";
  if (street === "flop") return "turn";
  if (street === "turn") return "river";
  return "showdown";
}

function findNextActiveInOrder(
  order: number[],
  players: PlayerState[],
  current: number
): number {
  const len = order.length;
  const startIdx = order.findIndex((s) => s === current);
  for (let step = 1; step <= len; step++) {
    const idx = order[(startIdx + step) % len];
    const p = players[idx];
    if (!p.folded && !p.allIn) return idx;
  }
  return current;
}

function computeBetOrRaiseAmount(
  game: GameState,
  street: Street,
  player: PlayerState
): { pay: number; newCurrentBet: number } {
  const { pot, currentBet } = game;

  if (currentBet === 0) {
    const open = street === "preflop" ? 3 : Math.ceil(Math.max(pot, 1) / 2);
    const pay = Math.min(open, player.stack);
    const newBet = player.bet + pay;
    return { pay, newCurrentBet: newBet };
  }

  const toCall = currentBet - player.bet;
  const call = Math.min(toCall, player.stack);
  const remaining = player.stack - call;
  const raisePart = remaining > 0 ? Math.min(toCall * 3, remaining) : 0;
  const pay = Math.min(call + raisePart, player.stack);
  const newBet = player.bet + pay;
  const newCurrentBet = Math.max(currentBet, newBet);
  return { pay, newCurrentBet };
}

export async function createInitialTable(
  playerCount: number,
  initialStack: number,
  btnIndex: number,
  rng: Rng = defaultRng
): Promise<TableState> {
  const preflopOrder = getPreflopOrder(btnIndex, playerCount);

  const { handId, hands, boardReserved } = await dealHandsFacade({
    source: "api",
    playerOrder: preflopOrder,
    mode: "superDense",
    rng,
  });

  const flop = boardReserved.slice(0, 3);
  const turn = boardReserved[3];
  const river = boardReserved[4];

  const players: PlayerState[] = hands.map((h, i) => {
    const { bb } = getPositions(btnIndex, playerCount);
    const isBB = i === bb;
    const posted = isBB ? 1 : 0; // BB=1BB
    const stackAfterBlind = Math.max(initialStack - posted, 0);
    return {
      hand: h,
      stack: stackAfterBlind,
      bet: posted,
      folded: false,
      allIn: stackAfterBlind === 0 && posted > 0,
    };
  });

  const pot = players.reduce((acc, p) => acc + p.bet, 0);
  const currentBet = 1; // BB posts 1BB
  const firstActor = findFirstActiveInOrder(preflopOrder, players);

  const game: GameState = {
    players,
    flop,
    turn,
    river,
    pot,
    currentBet,
  };

  return {
    game,
    boardReserved,
    street: "preflop",
    currentPlayer: firstActor,
    roundStarter: firstActor,
    lastAggressor: null,
    btnIndex,
    autoWin: null,
    handId,
    handStartedAt: Date.now(),
    initialStacks: Array(playerCount).fill(initialStack),
    actionLog: [],
  };
}

export function applyAction(
  gameState: TableState,
  action: PendingAction
): TableState {
  const { playerIndex, kind } = action;
  const { game, street } = gameState;

  const players = game.players.map((p) => ({ ...p }));
  const p = players[playerIndex];

  if (street === "showdown" || p.folded || p.allIn) return gameState;

  let pot = game.pot;
  let currentBet = game.currentBet;
  let lastAggressor = gameState.lastAggressor;
  let payAmount = 0;

  switch (kind) {
    case "fold": {
      p.folded = true;
      if (lastAggressor === playerIndex) {
        lastAggressor = null;
      }
      break;
    }
    case "check": {
      break;
    }
    case "call": {
      const toCall = Math.max(0, currentBet - p.bet);
      const pay = Math.min(toCall, p.stack);
      payAmount = pay;
      p.stack -= pay;
      p.bet += pay;
      pot += pay;
      if (p.stack === 0) p.allIn = true;
      break;
    }
    case "bet":
    case "raise": {
      const { pay, newCurrentBet } = computeBetOrRaiseAmount(
        game,
        street,
        p
      );
      payAmount = pay;
      p.stack -= pay;
      p.bet += pay;
      pot += pay;
      currentBet = newCurrentBet;
      if (p.stack === 0) p.allIn = true;
      lastAggressor = playerIndex;
      break;
    }
  }

  return {
    ...gameState,
    game: { ...game, players, pot, currentBet },
    lastAggressor,
    actionLog: [
      ...gameState.actionLog,
      {
        order: gameState.actionLog.length,
        street,
        playerIndex,
        kind,
        amount: payAmount,
        potAfter: pot,
        betAfter: p.bet,
        stackAfter: p.stack,
        currentBetAfter: currentBet,
        timestamp: Date.now(),
      },
    ],
  };
}

export function advanceAfterAction(state: TableState): TableState {
  let { game, street, currentPlayer, roundStarter, lastAggressor } = state;
  const players = game.players;
  const preflopOrder = getPreflopOrder(state.btnIndex, players.length);
  const postflopOrder = getPostflopOrder(state.btnIndex, players.length);
  const actionOrder = street === "preflop" ? preflopOrder : postflopOrder;
  const nextStreetOrder = street === "preflop" ? postflopOrder : postflopOrder;

  if (
    players[roundStarter]?.folded === true ||
    players[roundStarter]?.allIn === true
  ) {
    roundStarter = findFirstActiveInOrder(actionOrder, players);
  }

  const activeNotFolded = players.filter((p) => !p.folded);

  if (
    activeNotFolded.length > 0 &&
    activeNotFolded.every((p) => p.allIn)
  ) {
    return { ...state, street: "showdown" };
  }

  const activeIndices = players
    .map((p, i) => (!p.folded ? i : -1))
    .filter((i) => i !== -1);

  if (activeIndices.length <= 1) {
    const winner = activeIndices[0] ?? 0;
    return { ...state, street: "showdown", autoWin: winner };
  }

  const nextIndex = findNextActiveInOrder(actionOrder, players, currentPlayer);

  const everyoneMatchedOrAllIn = players
    .filter((p) => !p.folded)
    .every((p) => p.allIn || p.bet === game.currentBet);
  const effectiveStarter =
    players[roundStarter] && !players[roundStarter].folded && !players[roundStarter].allIn
      ? roundStarter
      : findFirstActiveInOrder(actionOrder, players);
  const cameFullCircleStarter = nextIndex === effectiveStarter;
  const cameBackToAggressor =
    lastAggressor !== null ? nextIndex === lastAggressor : cameFullCircleStarter;

  if (game.currentBet === 0) {
    if (cameFullCircleStarter) {
      const ns = nextStreet(street);
      if (ns === "showdown") return { ...state, street: "showdown" };
      const resetPlayers = players.map((p) => ({ ...p, bet: 0 }));
      const firstActive = findFirstActiveInOrder(nextStreetOrder, resetPlayers);
      return {
        ...state,
        game: { ...game, players: resetPlayers, currentBet: 0 },
        street: ns,
        currentPlayer: firstActive,
        roundStarter: firstActive,
        lastAggressor: null,
        autoWin: null,
      };
    } else {
      return { ...state, currentPlayer: nextIndex, roundStarter: effectiveStarter };
    }
  }

  if (everyoneMatchedOrAllIn && cameBackToAggressor) {
    const ns = nextStreet(street);
    if (ns === "showdown") return { ...state, street: "showdown" };
    const resetPlayers = players.map((p) => ({ ...p, bet: 0 }));
    const firstActive = findFirstActiveInOrder(nextStreetOrder, resetPlayers);
    return {
      ...state,
      game: { ...game, players: resetPlayers, currentBet: 0 },
      street: ns,
      currentPlayer: firstActive,
      roundStarter: firstActive,
      lastAggressor: null,
      autoWin: null,
    };
  }

  return { ...state, currentPlayer: nextIndex, roundStarter: effectiveStarter };
}

export function getLegalActions(
  table: TableState,
  playerIndex: number
): ActionKind[] {
  return getLegalActionsImpl(table, playerIndex);
}

export function pickRandomAction(
  table: TableState,
  playerIndex: number
): ActionKind {
  const legal = getLegalActionsImpl(table, playerIndex);
  if (legal.length === 0) return "check";
  const idx = Math.floor(defaultRng.random() * legal.length);
  return legal[idx];
}

export { pickAiAction };

export function makeActionLabel(
  kind: ActionKind,
  table: TableState,
  playerIndex: number
): string {
  const p = table.game.players[playerIndex];
  const toCall = Math.max(0, table.game.currentBet - p.bet);
  const wouldAllInCall = kind === "call" && toCall >= p.stack && p.stack > 0;

  if (kind === "bet" || kind === "raise") {
    const { pay } = computeBetOrRaiseAmount(table.game, table.street, p);
    if (pay >= p.stack && p.stack > 0) {
      return `All-in (${p.stack}BB)`;
    }
  }
  if (wouldAllInCall) {
    return `All-in (${p.stack}BB)`;
  }

  switch (kind) {
    case "fold":
      return "Fold";
    case "check":
      return "Check";
    case "call":
      return `Call (${toCall}BB)`;
    case "bet":
      return "Bet";
    case "raise":
      return "Raise";
  }
}
