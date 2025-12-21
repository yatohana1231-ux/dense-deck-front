type HeroActionsProps = {
  isHeroTurn: boolean;
  heroCanCheck: boolean;
  heroCanBetOrRaise: boolean;
  currentBet: number;
  toCall: number;
  onFold: () => void;
  onCheckOrCall: () => void;
  onBetOrRaise: () => void;
};

export default function HeroActions({
  isHeroTurn,
  heroCanCheck,
  heroCanBetOrRaise,
  currentBet,
  toCall,
  onFold,
  onCheckOrCall,
  onBetOrRaise,
}: HeroActionsProps) {
  return (
    <div className="flex flex-col items-center gap-1 mt-1">
      <div className="text-xs text-slate-300">To Call: {toCall} BB</div>
      <div className="flex gap-3">
        <button
          onClick={onFold}
          disabled={!isHeroTurn || toCall === 0}
          className={`px-3 py-1 rounded-md text-sm ${
            isHeroTurn && toCall !== 0
              ? "bg-rose-600 hover:bg-rose-500 text-white"
              : "bg-slate-700 text-slate-400 cursor-not-allowed"
          }`}
        >
          Fold
        </button>

        <button
          onClick={onCheckOrCall}
          disabled={!isHeroTurn}
          className={`px-3 py-1 rounded-md text-sm ${
            isHeroTurn
              ? "bg-slate-600 hover:bg-slate-500 text-white"
              : "bg-slate-700 text-slate-400 cursor-not-allowed"
          }`}
        >
          {heroCanCheck ? "Check" : "Call"}
        </button>

        <button
          onClick={onBetOrRaise}
          disabled={!isHeroTurn || !heroCanBetOrRaise}
          className={`px-3 py-1 rounded-md text-sm ${
            isHeroTurn && heroCanBetOrRaise
              ? "bg-emerald-600 hover:bg-emerald-500 text-white"
              : "bg-slate-700 text-slate-400 cursor-not-allowed"
          }`}
        >
          {currentBet === 0 ? "Bet" : "Raise"}
        </button>
      </div>
    </div>
  );
}
