import type { Position } from "./types.js";

export function getPosition(
  playerIndex: number,
  btnIndex: number,
  playerCount: number
): Position {
  if (playerCount <= 2) {
    if (playerIndex === btnIndex) return "BTN";
    return "BB";
  }
  if (playerCount === 3) {
    if (playerIndex === btnIndex) return "BTN";
    if (playerIndex === (btnIndex + 1) % playerCount) return "UTG";
    return "BB";
  }
  if (playerIndex === btnIndex) return "BTN";
  if (playerIndex === (btnIndex + 1) % playerCount) return "BB";
  if (playerIndex === (btnIndex + 2) % playerCount) return "UTG";
  return "CO";
}

export function getPositions(btnIndex: number, playerCount: number) {
  const btn = btnIndex % Math.max(playerCount, 1);
  if (playerCount <= 2) {
    const bb = (btn + 1) % playerCount;
    return { bb, utg: btn, co: bb, btn };
  }
  if (playerCount === 3) {
    const utg = (btn + 1) % playerCount;
    const bb = (btn + 2) % playerCount;
    return { bb, utg, co: utg, btn };
  }
  const bb = (btn + 1) % playerCount;
  const utg = (btn + 2) % playerCount;
  const co = (btn + 3) % playerCount;
  return { bb, utg, co, btn };
}

export function getPreflopOrder(btnIndex: number, playerCount: number): number[] {
  const { bb, utg, co } = getPositions(btnIndex, playerCount);
  if (playerCount <= 2) return [btnIndex % playerCount, bb];
  if (playerCount === 3) return [utg, btnIndex % playerCount, bb];
  // Clockwise: BTN -> BB -> UTG -> CO. Action: UTG -> CO -> BTN -> BB.
  return [utg, co, btnIndex % playerCount, bb];
}

export function getPostflopOrder(btnIndex: number, playerCount: number): number[] {
  const { bb, utg, co, btn } = getPositions(btnIndex, playerCount);
  if (playerCount <= 2) return [bb, btn];
  if (playerCount === 3) return [bb, utg, btn];
  // Postflop action: BB -> UTG -> CO -> BTN -> BB.
  return [bb, utg, co, btn];
}

