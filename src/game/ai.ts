import { evaluateBestOfSeven } from "./handEval.js";
import type { ActionKind, TableState, Position } from "./types.js";
import { getPosition } from "./positions.js";
import type { Rng } from "./rng.js";

function getVisibleBoard(table: TableState) {
  const { flop, turn, river } = table.game;
  switch (table.street) {
    case "preflop":
      return [];
    case "flop":
      return flop;
    case "turn":
      return [...flop, turn];
    default:
      return [...flop, turn, river];
  }
}

function hasStrongMadeHandOrDraw(
  table: TableState,
  playerIndex: number
): { made: boolean; strongMade: boolean; strongDraw: boolean } {
  const board = getVisibleBoard(table);
  const player = table.game.players[playerIndex];
  const cards = [...player.hand, ...board];

  if (cards.length < 5) {
    const suits = cards.map((c) => c.suit);
    const flushDraw = suits.some(
      (suit) => suits.filter((x) => x === suit).length >= 4
    );
    const ranks = Array.from(new Set(cards.map((c) => c.rank)))
      .map((r) => "23456789TJQKA".indexOf(r as string))
      .filter((v) => v >= 0)
      .sort((a, b) => a - b);
    let straightDraw = false;
    for (let i = 0; i < ranks.length; i++) {
      const window = ranks.filter((v) => v >= ranks[i] && v <= ranks[i] + 4);
      const unique = Array.from(new Set(window));
      if (unique.length >= 4 && unique[unique.length - 1] - unique[0] <= 4) {
        straightDraw = true;
        break;
      }
    }
    return { made: false, strongMade: false, strongDraw: flushDraw || straightDraw };
  }

  const value = evaluateBestOfSeven(player.hand, board);
  const made = value.category !== "high-card";
  const strongMade =
    value.category === "three-of-a-kind" ||
    value.category === "straight" ||
    value.category === "flush" ||
    value.category === "full-house" ||
    value.category === "four-of-a-kind" ||
    value.category === "straight-flush";
  return { made, strongMade, strongDraw: false };
}

export function getLegalActions(
  table: TableState,
  playerIndex: number
): ActionKind[] {
  const { game, street } = table;
  if (street === "showdown") return [];
  const p = game.players[playerIndex];
  if (p.folded || p.allIn) return [];

  const actions: ActionKind[] = [];
  const toCall = Math.max(0, game.currentBet - p.bet);

  if (toCall === 0) {
    actions.push("check");
    if (p.stack > 0) actions.push("bet");
  } else {
    actions.push("fold");
    if (p.stack > 0) actions.push("call");
    if (p.stack > toCall) actions.push("raise");
  }
  return actions;
}

function decidePreflop(
  table: TableState,
  playerIndex: number,
  legal: ActionKind[],
  rng: Rng
): ActionKind {
  const role = getPosition(playerIndex, table.btnIndex, table.game.players.length);
  const player = table.game.players[playerIndex];
  const toCall = Math.max(0, table.game.currentBet - player.bet);
  const canRaise = legal.includes("raise") || legal.includes("bet");
  const canCall = legal.includes("call");
  const canCheck = legal.includes("check");
  const canFold = legal.includes("fold");

  if (toCall === 0) {
    if (role === "BB") {
      return canCheck ? "check" : "fold";
    }
    const openOdds: Record<Position, number> = {
      UTG: 0.85,
      CO: 0.95,
      BTN: 1.0,
      BB: 0,
    };
    if (rng.random() < openOdds[role] && canRaise) {
      return table.game.currentBet === 0 ? "bet" : "raise";
    }
    if (canCheck) return "check";
    return canFold ? "fold" : (canCall ? "call" : "check");
  } else {
    const defendOdds: Record<Position, number> = {
      UTG: 0.6,
      CO: 0.7,
      BTN: 0.85,
      BB: 0.8,
    };
    const aggressiveOdds: Record<Position, number> = {
      UTG: 0.1,
      CO: 0.15,
      BTN: 0.2,
      BB: 0.15,
    };

    if (canRaise && rng.random() < aggressiveOdds[role]) {
      return "raise";
    }
    if (canCall && rng.random() < defendOdds[role]) {
      return "call";
    }
    return canFold ? "fold" : (canCall ? "call" : "check");
  }
}

export function pickAiAction(
  table: TableState,
  playerIndex: number,
  rng: Rng
): ActionKind {
  const legal = getLegalActions(table, playerIndex);
  if (legal.length === 0) return "check";

  if (table.street === "preflop") {
    return decidePreflop(table, playerIndex, legal, rng);
  }

  const { made, strongMade, strongDraw } = hasStrongMadeHandOrDraw(
    table,
    playerIndex
  );
  const player = table.game.players[playerIndex];
  const toCall = Math.max(0, table.game.currentBet - player.bet);
  const canRaise = legal.includes("raise") || legal.includes("bet");
  const canCall = legal.includes("call");
  const canCheck = legal.includes("check");
  const canFold = legal.includes("fold");

  const noBet = toCall === 0;

  if (noBet) {
    if ((strongMade || made || strongDraw) && canRaise) {
      return table.game.currentBet === 0 ? "bet" : "raise";
    }
    return canCheck ? "check" : "call";
  } else {
    if ((strongMade || made) && canCall) {
      return "call";
    }
    if (strongDraw && canCall) {
      return "call";
    }
    return canFold ? "fold" : (canCall ? "call" : "check");
  }
}

