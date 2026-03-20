import {
  type Street,
  type ActionKind,
  type PlayerState,
  type GameState,
  type TableState,
  type PendingAction,
} from "./types.js";
import {
  getPositions,
  getPreflopOrder,
  getPostflopOrder,
} from "./positions.js";
import { pickAiAction, getLegalActions as getLegalActionsImpl } from "./ai.js";
import type { Rng } from "./rng.js";
import { defaultRng } from "./rng.js";
import {
  type DealSource,
  dealInitialHandsFacade,
  revealStreetCardsFacade,
} from "../deal/dealFacade.js";
import type { Mode } from "../api/deal.js";

export type {
  Street,
  ActionKind,
  PlayerState,
  GameState,
  TableState,
  PendingAction,
  ActionLogEntry,
} from "./types.js";

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

function streetToDealValue(street: Street): 1 | 2 | 3 {
  if (street === "flop") return 1;
  if (street === "turn") return 2;
  return 3;
}

function isRevealStreet(street: Street): street is "flop" | "turn" | "river" {
  return street === "flop" || street === "turn" || street === "river";
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

function computePots(players: PlayerState[], initialStacks: number[]) {
  const contributions = players.map((p, i) => {
    const initial = initialStacks[i] ?? 0;
    return Math.max(0, initial - p.stack);
  });
  const levels = Array.from(new Set(contributions.filter((c) => c > 0))).sort(
    (a, b) => a - b
  );
  let prev = 0;
  const pots = [];
  for (const level of levels) {
    const contributors = contributions
      .map((c, i) => (c >= level ? i : -1))
      .filter((i) => i !== -1);
    const amount = (level - prev) * contributors.length;
    if (amount <= 0) {
      prev = level;
      continue;
    }
    const eligible = players
      .map((p, i) => (!p.folded && contributions[i] >= level ? i : -1))
      .filter((i) => i !== -1);
    pots.push({ amount, eligible });
    prev = level;
  }
  return pots;
}

function getDealContext(state: TableState): {
  source: DealSource;
  mode: Mode;
  playerOrder: number[];
} {
  return {
    source: state.dealSource ?? "api",
    mode: state.dealMode ?? "superDense",
    playerOrder: state.dealPlayerOrder ?? getPreflopOrder(state.btnIndex, state.game.players.length),
  };
}

function applyRevealedBoard(
  state: TableState,
  cards: { flop: PlayerState["hand"]; turn: PlayerState["hand"]; river: PlayerState["hand"] }
): TableState {
  const nextTurn = cards.turn[0] ?? null;
  const nextRiver = cards.river[0] ?? null;
  return {
    ...state,
    game: {
      ...state.game,
      flop: cards.flop,
      turn: nextTurn,
      river: nextRiver,
    },
    boardReserved: [...cards.flop, ...cards.turn, ...cards.river],
  };
}

async function revealStreet(state: TableState, street: "flop" | "turn" | "river"): Promise<TableState> {
  const { source, mode, playerOrder } = getDealContext(state);
  const result = await revealStreetCardsFacade({
    source,
    handId: state.handId,
    playerOrder,
    mode,
    street: streetToDealValue(street),
    expectedFlop: state.game.flop,
    expectedTurn: state.game.turn ? [state.game.turn] : [],
  });
  return applyRevealedBoard(state, result);
}

async function ensureBoardThroughStreet(
  state: TableState,
  targetStreet: "flop" | "turn" | "river"
): Promise<TableState> {
  let next = state;
  if (next.game.flop.length === 0) {
    next = await revealStreet(next, "flop");
  }
  if (targetStreet === "flop") return next;
  if (!next.game.turn) {
    next = await revealStreet(next, "turn");
  }
  if (targetStreet === "turn") return next;
  if (!next.game.river) {
    next = await revealStreet(next, "river");
  }
  return next;
}

async function moveToStreet(state: TableState, street: "flop" | "turn" | "river"): Promise<TableState> {
  const resetPlayers = state.game.players.map((p) => ({ ...p, bet: 0 }));
  const firstActive = findFirstActiveInOrder(
    getPostflopOrder(state.btnIndex, resetPlayers.length),
    resetPlayers
  );
  const advancedState: TableState = {
    ...state,
    game: { ...state.game, players: resetPlayers, currentBet: 0 },
    street,
    currentPlayer: firstActive,
    roundStarter: firstActive,
    lastAggressor: null,
    lastRaise: 100,
    raiseBlocked: false,
    revealStreet: street,
    autoWin: null,
  };
  return ensureBoardThroughStreet(advancedState, street);
}

async function moveToShowdownWithRunout(state: TableState): Promise<TableState> {
  const revealed = await ensureBoardThroughStreet(state, "river");
  return {
    ...revealed,
    street: "showdown",
    revealStreet: "river",
  };
}

export async function createInitialTable(
  playerCount: number,
  initialStack: number,
  btnIndex: number,
  rng: Rng = defaultRng
): Promise<TableState> {
  const preflopOrder = getPreflopOrder(btnIndex, playerCount);
  const dealSource: DealSource = "api";
  const dealMode: Mode = "superDense";

  const { handId, hands } = await dealInitialHandsFacade({
    source: dealSource,
    playerOrder: preflopOrder,
    mode: dealMode,
    rng,
  });

  const players: PlayerState[] = hands.map((h, i) => {
    const { bb } = getPositions(btnIndex, playerCount);
    const isBB = i === bb;
    const posted = isBB ? 100 : 0;
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
  const currentBet = 100;
  const firstActor = findFirstActiveInOrder(preflopOrder, players);

  const game: GameState = {
    players,
    flop: [],
    turn: null,
    river: null,
    pot,
    currentBet,
  };
  const initialStacks = Array(playerCount).fill(initialStack);
  const pots = computePots(players, initialStacks);

  return {
    game,
    boardReserved: [],
    street: "preflop",
    currentPlayer: firstActor,
    roundStarter: firstActor,
    lastAggressor: null,
    lastRaise: 100,
    raiseBlocked: false,
    btnIndex,
    autoWin: null,
    revealStreet: "preflop",
    handId,
    handStartedAt: Date.now(),
    initialStacks,
    actionLog: [],
    pots,
    dealSource,
    dealMode,
    dealPlayerOrder: preflopOrder,
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
  let lastRaise = gameState.lastRaise ?? 100;
  let raiseBlocked = gameState.raiseBlocked ?? false;
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
      const maxTotal = p.bet + p.stack;
      const desiredTotal =
        action.amount !== undefined ? Math.max(0, action.amount) : p.bet;

      if (currentBet === 0) {
        const minBet = 100;
        const targetTotal = Math.min(Math.max(desiredTotal, minBet), maxTotal);
        const pay = Math.max(0, targetTotal - p.bet);
        payAmount = pay;
        p.stack -= pay;
        p.bet += pay;
        pot += pay;
        currentBet = p.bet;
        lastRaise = currentBet;
        raiseBlocked = false;
        if (p.stack === 0) p.allIn = true;
        lastAggressor = playerIndex;
      } else {
        const minRaiseTotal = Math.max(currentBet + lastRaise, currentBet + 100);
        const targetTotal = Math.min(
          Math.max(desiredTotal, minRaiseTotal),
          maxTotal
        );
        const pay = Math.max(0, targetTotal - p.bet);
        payAmount = pay;
        p.stack -= pay;
        p.bet += pay;
        pot += pay;
        const raiseSize = p.bet - currentBet;
        if (raiseSize >= lastRaise) {
          lastRaise = raiseSize;
          currentBet = p.bet;
          lastAggressor = playerIndex;
          raiseBlocked = false;
        } else {
          currentBet = Math.max(currentBet, p.bet);
          raiseBlocked = true;
        }
        if (p.stack === 0) p.allIn = true;
      }
      break;
    }
  }

  return {
    ...gameState,
    game: { ...game, players, pot, currentBet },
    lastAggressor,
    lastRaise,
    raiseBlocked,
    revealStreet: gameState.revealStreet,
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
    pots: computePots(players, gameState.initialStacks ?? []),
  };
}

export async function advanceAfterAction(state: TableState): Promise<TableState> {
  let { game, street, currentPlayer, roundStarter, lastAggressor } = state;
  const players = game.players;
  const preflopOrder = getPreflopOrder(state.btnIndex, players.length);
  const postflopOrder = getPostflopOrder(state.btnIndex, players.length);
  const actionOrder = street === "preflop" ? preflopOrder : postflopOrder;

  if (
    players[roundStarter]?.folded === true ||
    players[roundStarter]?.allIn === true
  ) {
    roundStarter = findFirstActiveInOrder(actionOrder, players);
  }

  const activeNotFolded = players.filter((p) => !p.folded);
  const actionable = activeNotFolded.filter((p) => !p.allIn);

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
  const lastAggressorInactive =
    lastAggressor === null ||
    players[lastAggressor]?.folded === true ||
    players[lastAggressor]?.allIn === true;
  const aggressorActed =
    lastAggressor !== null && currentPlayer === lastAggressor;

  if (actionable.length <= 1 && everyoneMatchedOrAllIn) {
    return moveToShowdownWithRunout(state);
  }

  if (actionable.length === 0 && everyoneMatchedOrAllIn) {
    return moveToShowdownWithRunout(state);
  }

  if (game.currentBet === 0) {
    if (cameFullCircleStarter) {
      const ns = nextStreet(street);
      if (ns === "showdown") return { ...state, street: "showdown", revealStreet: street };
      if (actionable.length <= 1) {
        return moveToShowdownWithRunout(state);
      }
      if (!isRevealStreet(ns)) {
        throw new Error(`advanceAfterAction: invalid next street ${ns}`);
      }
      return moveToStreet(state, ns);
    }
    return { ...state, currentPlayer: nextIndex, roundStarter: effectiveStarter };
  }

  if (
    everyoneMatchedOrAllIn &&
    (aggressorActed ||
      (lastAggressorInactive ? cameFullCircleStarter : cameBackToAggressor))
  ) {
    const ns = nextStreet(street);
    if (ns === "showdown") return { ...state, street: "showdown" };
    if (actionable.length <= 1) {
      return moveToShowdownWithRunout(state);
    }
    if (!isRevealStreet(ns)) {
      throw new Error(`advanceAfterAction: invalid next street ${ns}`);
    }
    return moveToStreet(state, ns);
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

  if ((kind === "bet" || kind === "raise") && p.stack > 0) {
    const isAllIn = p.stack + p.bet <= table.game.currentBet || p.stack === 0;
    if (isAllIn) {
      return `All-in (${p.stack}pt)`;
    }
  }
  if (wouldAllInCall) {
    return `All-in (${p.stack}pt)`;
  }

  switch (kind) {
    case "fold":
      return "Fold";
    case "check":
      return "Check";
    case "call":
      return `Call (${toCall}pt)`;
    case "bet":
      return "Bet";
    case "raise":
      return "Raise";
  }
}
