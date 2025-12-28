// src/game/getHandClass.ts

import type { Card } from "../components/cards.js";

const order = "23456789TJQKA";

/** 2枚�EカードかめE"AKs" / "QJo" / "88" のようなキーを作る */
export function getHandClass(c1: Card, c2: Card): string {
  const r1 = c1.rank;
  const r2 = c2.rank;

  if (r1 === r2) return `${r1}${r2}`;

  const [hi, lo] =
    order.indexOf(r1) > order.indexOf(r2) ? [r1, r2] : [r2, r1];

  const suited = c1.suit === c2.suit;
  return `${hi}${lo}${suited ? "s" : "o"}`;
}

