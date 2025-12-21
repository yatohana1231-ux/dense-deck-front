// src/components/cards.ts

// Internal suit representation: "s" | "h" | "d" | "c"
export type Suit = "s" | "h" | "d" | "c";
export type Rank =
  | "A" | "K" | "Q" | "J"
  | "T" | "9" | "8" | "7" | "6" | "5" | "4" | "3" | "2";

export interface Card {
  rank: Rank;
  suit: Suit;
}

/** All suits */
export const suits: Suit[] = ["s", "h", "d", "c"];

/** Ranks (A high) */
export const ranks: Rank[] = [
  "A","K","Q","J",
  "T","9","8","7","6","5","4","3","2"
];

/** Generate 52-card deck */
export function generateDeck(): Card[] {
  const deck: Card[] = [];
  for (const r of ranks) {
    for (const s of suits) {
      deck.push({ rank: r, suit: s });
    }
  }
  return deck;
}

/** Convert suit to symbol for display */
export function suitToSymbol(s: Suit): "♠" | "♥" | "♦" | "♣" {
  switch (s) {
    case "s": return "♠";
    case "h": return "♥";
    case "d": return "♦";
    case "c": return "♣";
  }
}
