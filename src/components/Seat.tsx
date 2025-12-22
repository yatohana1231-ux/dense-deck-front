import Card from "./Card";
import CardBack from "./CardBack";
import type { Card as CardType } from "./cards";
import type { PlayerState } from "../game/table";

type SeatProps = {
  label: string;
  hand: CardType[];
  player: PlayerState;
  isHero?: boolean;
  isWinner?: boolean;
  handDescription?: string;
  showCards: boolean;
  isButton?: boolean;
  popupText?: string;
  isActive?: boolean;
};

export default function Seat({
  label,
  hand,
  player,
  isHero,
  isWinner,
  handDescription,
  showCards,
  isButton,
  popupText,
  isActive = true,
}: SeatProps) {
  return (
    <div
      className={`flex flex-col items-center gap-1 transition ${
        isActive ? "" : "opacity-40 grayscale"
      }`}
    >
      {/* アクションポップアップ：高さを固定してレイアウト崩れを防ぐ */}
      <div className="h-6 flex items-center">
        {popupText ? (
          <div className="text-xs px-2 py-0.5 rounded-full bg-slate-800/90 border border-slate-600 text-slate-100">
            {popupText}
          </div>
        ) : (
          <div className="h-5" aria-hidden="true" />
        )}
      </div>

      <div className="text-sm flex flex-col items-center">
        <span
          className={`${isHero ? "text-yellow-300 font-semibold" : ""} ${
            isWinner ? "text-emerald-300 font-semibold" : ""
          }`}
        >
          {label}
          {isButton && (
            <span className="ml-1 inline-flex items-center justify-center text-[10px] px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-900">
              BTN
            </span>
          )}
        </span>

        <span className="mt-0.5 h-4 text-xs text-slate-300">
          {handDescription ?? "\u00A0"}
        </span>

        <span className="h-4 text-[10px] font-semibold">
          {isWinner ? (
            <span className="text-emerald-300">WINNER</span>
          ) : player.folded ? (
            <span className="text-slate-400">FOLDED</span>
          ) : (
            "\u00A0"
          )}
        </span>

        <span className="h-4 text-[10px] text-slate-300">
          Stack: {player.stack} BB
        </span>
      </div>

      <div className="flex gap-2">
        {showCards
          ? hand.map((c, idx) => <Card key={idx} card={c} />)
          : hand.map((_, idx) => <CardBack key={idx} />)}
      </div>
    </div>
  );
}
