import Card from "./Card.js";
import CardBack from "./CardBack.js";
import type { Card as CardType } from "./cards.js";
import type { PlayerState } from "../game/table.js";

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
  stackDisplay?: "chips" | "blinds";
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
  stackDisplay = "blinds",
}: SeatProps) {
  const displayPopup =
    popupText ??
    handDescription ??
    (isWinner ? "WINNER" : player.folded ? "FOLDED" : undefined);

  return (
    <div
      className={`relative flex flex-col items-center gap-1 transition ${
        isActive ? "" : "opacity-40 grayscale"
      }`}
    >
      {displayPopup && (
        <div
          className={`absolute -top-2 left-1/2 -translate-x-1/2 z-10 text-sm px-4 py-1.5 min-w-[12rem] max-w-[16rem] w-max rounded-full text-center leading-tight whitespace-pre-line break-words shadow-sm ${
            isWinner
              ? "bg-emerald-400/95 border border-emerald-200 text-slate-900"
              : player.folded
              ? "bg-slate-600/80 border border-slate-500 text-slate-200"
              : "bg-sky-500/90 border border-sky-300/70 text-slate-900"
          }`}
        >
          {displayPopup}
        </div>
      )}

      <div className="text-sm flex flex-col items-center leading-tight">
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
        <span className="text-[10px] text-slate-300">
          Stack: {player.stack} {stackDisplay === "blinds" ? "points" : "chips"}
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
