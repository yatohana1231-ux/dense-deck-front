type Props = {
  currentPlayer: number;
  legal: string[];
  amount: number;
  onAmountChange: (v: number) => void;
  onAction: (kind: string) => void;
  onAllIn?: () => void;
  disabled?: boolean;
  toCall?: number;
  minBetTotal?: number;
  minRaiseTotal?: number;
  stack?: number;
};

export default function RoomActionBar({
  currentPlayer,
  legal,
  amount,
  onAmountChange,
  onAction,
  onAllIn,
  disabled,
  toCall,
  minBetTotal,
  minRaiseTotal,
  stack,
}: Props) {
  const primaryAction = legal.includes("bet")
    ? "bet"
    : legal.includes("raise")
    ? "raise"
    : legal[0];

  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs text-slate-300">Current Player: {currentPlayer}</div>
      <div className="flex flex-col gap-1 text-xs text-slate-300">
        <div className="flex gap-3 items-center flex-wrap">
          {typeof toCall === "number" && <span>To Call: {toCall}</span>}
          {typeof minBetTotal === "number" && <span>Min Bet Total: {minBetTotal}</span>}
          {typeof minRaiseTotal === "number" && <span>Min Raise Total: {minRaiseTotal}</span>}
          {typeof stack === "number" && <span>Stack: {stack}</span>}
        </div>
        <div className="flex gap-2 items-center text-xs">
          <label>
            Amount
            <input
              type="number"
              value={amount}
              onChange={(e) => onAmountChange(Number(e.target.value))}
              onBlur={(e) => {
                if (typeof stack !== "number") return;
                const next = Number(e.target.value);
                if (Number.isFinite(next) && next > stack) {
                  onAmountChange(stack);
                }
              }}
              onFocus={(e) => e.target.select()}
              onKeyDown={(e) => {
                if (e.key === "Enter" && primaryAction) {
                  e.preventDefault();
                  onAction(primaryAction);
                }
              }}
              className="ml-1 w-24 px-2 py-1 rounded bg-slate-800 border border-slate-600 text-slate-100"
              disabled={disabled}
            />
          </label>
          <div className="flex gap-1">
            {typeof stack === "number" && (
              <button
                type="button"
                onClick={() => onAllIn?.()}
                disabled={disabled || stack <= 0}
                className={`px-3 py-1 rounded bg-sky-600 hover:bg-sky-500 text-xs font-semibold ${
                  disabled || stack <= 0 ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                All-in
              </button>
            )}
            {legal.map((k) => (
              <button
                key={k}
                onClick={() => onAction(k)}
                disabled={disabled}
                className={`px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold ${
                  disabled ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {k}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
