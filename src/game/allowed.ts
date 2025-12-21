// src/game/allowed.ts

import rawAllowed from "./allowedHands.json";
import type { Card } from "../components/cards"
import { getHandClass } from "./getHandClass";

// allowedHands.json の型
type ModeEntry =
  | boolean
  | {
      superDense?: boolean;
      // 他のモード（normalDense など）も将来入る想定
      [mode: string]: boolean | undefined;
    };

const allowed = rawAllowed as Record<string, ModeEntry>;

export function isAllowedHand(c1: Card, c2: Card): boolean {
  const cls = getHandClass(c1, c2);
  const entry = allowed[cls];

  // キーそのものが存在しない → 不許可扱い
  if (entry === undefined) return false;

  // 値が boolean の場合（シンプル版JSONにも対応）
  if (typeof entry === "boolean") return entry;

  // モード付き形式の場合は superDense を見る
  return !!entry.superDense;
}
