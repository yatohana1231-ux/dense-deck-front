// src/components/Card.tsx
import type { Card as CardType } from "./cards";
import { suitToSymbol } from "./cards";

export default function Card({ card }: { card: CardType }) {
  const symbol = suitToSymbol(card.suit);
  const isRed = card.suit === "h" || card.suit === "d";

  return (
    <div
      className="
        relative
        w-14 h-20
        bg-white
        rounded-xl
        shadow-lg
        border
        flex
        items-center
        justify-center
        select-none
      "
    >
      {/* 左上 */}
      <div
        className={`
          absolute top-1 left-1 text-xs font-bold
          ${isRed ? "text-red-600" : "text-black"}
        `}
      >
        {card.rank}
        {symbol}
      </div>

      {/* 中央 */}
      <div
        className={`
          ${isRed ? "text-red-400" : "text-gray-700"}
          text-2xl
        `}
      >
        {symbol}
      </div>

      {/* 右下、上下逆向き */}
      <div
        className={`
          absolute bottom-1 right-1 text-xs font-bold rotate-180
          ${isRed ? "text-red-600" : "text-black"}
        `}
      >
        {card.rank}
        {symbol}
      </div>
    </div>
  );
}
