import Card from "./Card.js";
import type { Card as CardType } from "./cards.js";

type BoardAreaProps = {
  cards: CardType[];
  pot: number;
  pots?: { amount: number; eligible: number[] }[];
};

export default function BoardArea({ cards, pot, pots }: BoardAreaProps) {
  const totalPot =
    pots && pots.length > 0 ? pots.reduce((sum, p) => sum + p.amount, 0) : pot;
  const sidePots = pots && pots.length > 1 ? pots.slice(1) : [];

  return (
    <div className="w-full max-w-[520px] h-32 rounded-2xl bg-emerald-900/80 border border-emerald-500 shadow-xl flex flex-col items-center justify-center px-3 py-2 gap-2">
      <div className="w-full flex justify-center">
        <span className="text-xs text-emerald-100">Pot: {totalPot} BB</span>
      </div>
      {sidePots.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-emerald-100">
          <span>Main: {pots?.[0]?.amount ?? totalPot} BB</span>
          {sidePots.map((p, idx) => (
            <span key={`side-${idx}`}>Side {idx + 1}: {p.amount} BB</span>
          ))}
        </div>
      )}
      <div className="flex items-center justify-center h-20">
        {cards.length === 0 ? (
          <span className="text-slate-200 text-sm">Open the board after the action.</span>
        ) : (
          <div className="flex gap-2">
            {cards.map((c, idx) => (
              <Card key={`board-${idx}`} card={c} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

