// src/game/allowed.ts

import rawAllowed from "./allowedHands.json";
import type { Card } from "../components/cards.js"
import { getHandClass } from "./getHandClass.js";

// allowedHands.json の垁E
type ModeEntry =
  | boolean
  | {
      superDense?: boolean;
      // 他�Eモード！EormalDense など�E�も封E��入る想宁E
      [mode: string]: boolean | undefined;
    };

const allowed = rawAllowed as Record<string, ModeEntry>;

export function isAllowedHand(c1: Card, c2: Card): boolean {
  const cls = getHandClass(c1, c2);
  const entry = allowed[cls];

  // キーそ�Eも�Eが存在しなぁEↁE不許可扱ぁE
  if (entry === undefined) return false;

  // 値ぁEboolean の場合（シンプル牁ESONにも対応！E
  if (typeof entry === "boolean") return entry;

  // モード付き形式�E場合�E superDense を見る
  return !!entry.superDense;
}

