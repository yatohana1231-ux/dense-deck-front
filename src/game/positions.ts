import type { Position } from "./types.js";

export function getPosition(
  playerIndex: number,
  btnIndex: number,
  playerCount: number
): Position {
  if (playerIndex === btnIndex) return "BTN";
  if (playerIndex === (btnIndex + 1) % playerCount) return "BB";
  if (playerIndex === (btnIndex + 2) % playerCount) return "UTG";
  return "CO";
}

export function getPositions(btnIndex: number, playerCount: number) {
  const bb = (btnIndex + 1) % playerCount;
  const utg = (bb + 1) % playerCount;
  const co = (utg + 1) % playerCount;
  return { bb, utg, co, btn: btnIndex };
}

export function getPreflopOrder(btnIndex: number, playerCount: number): number[] {
  const { bb, utg, co } = getPositions(btnIndex, playerCount);
  // Clockwise: BTN -> BB -> UTG -> CO. Action: UTG -> CO -> BTN -> BB.
  return [utg, co, btnIndex, bb];
}

export function getPostflopOrder(btnIndex: number, playerCount: number): number[] {
  const { bb, utg, co, btn } = getPositions(btnIndex, playerCount);
  // Postflop action: BB -> UTG -> CO -> BTN -> BB.
  return [bb, utg, co, btn];
}

