import Card from "./Card.js";
import type { Card as CardType } from "./cards.js";

type BoardAreaProps = {
  cards: CardType[];
  pot: number;
};

export default function BoardArea({ cards, pot }: BoardAreaProps) {
  return (
    <div className="w-full max-w-[520px] h-32 rounded-2xl bg-emerald-900/80 border border-emerald-500 shadow-xl flex flex-col items-center justify-center px-3 py-2 gap-2">
      <div className="w-full flex justify-center">
        <span className="text-xs text-emerald-100">Pot: {pot} BB</span>
      </div>
      <div className="flex items-center justify-center h-20">
        {cards.length === 0 ? (
          <span className="text-slate-200 text-sm">アクション後にボードをオープン</span>
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

