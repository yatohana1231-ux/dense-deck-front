type HeroActionsProps = {
  isHeroTurn: boolean;
  heroCanCheck: boolean;
  heroCanBetOrRaise: boolean;
  currentBet: number;
  toCall: number;
  minBet: number;
  maxBet: number;
  amount: number;
  onAmountChange: (v: number) => void;
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
  minBet,
  maxBet,
  amount,
  onAmountChange,
  onFold,
  onCheckOrCall,
  onBetOrRaise,
}: HeroActionsProps) {
  return (
    <div className="flex flex-col items-center gap-1 mt-1">
      <div className="text-xs text-slate-300">To Call: {toCall} BB</div>
      <div className="flex items-center gap-2">
        <label className="text-xs text-slate-300">
          {currentBet === 0 ? "Bet" : "Raise"} to:
        </label>
        <input
          type="number"
          min={minBet}
          max={maxBet}
          value={amount}
          onChange={(e) => onAmountChange(Number(e.target.value))}
          disabled={!isHeroTurn || !heroCanBetOrRaise}
          className="w-24 px-2 py-1 rounded bg-slate-800 border border-slate-600 text-slate-100 text-sm"
          onFocus={(e) => e.target.select()}
          onKeyDown={(e) => {
            if (e.key === "Enter" && isHeroTurn && heroCanBetOrRaise) {
              e.preventDefault();
              onBetOrRaise();
            }
          }}
        />
        <div className="text-[10px] text-slate-400">
          Min {minBet} / Max {maxBet}
        </div>
      </div>
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
