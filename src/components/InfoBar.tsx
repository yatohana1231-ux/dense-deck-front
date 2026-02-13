type InfoBarProps = {
  streetLabel: string;
  pot: number;
  devShowAll: boolean;
  onToggleShowAll: () => void;
  onNewHand: () => void;
  showdownText?: string;
};

export default function InfoBar({
  streetLabel,
  pot,
  devShowAll,
  onToggleShowAll,
  onNewHand,
  showdownText,
}: InfoBarProps) {
  return (
    <div className="mt-4 flex items-center gap-4 flex-wrap">
      <div className="text-sm">
        現在のステージ:{" "}
        <span className="font-semibold">{streetLabel}</span>
      </div>

      <div className="text-sm">
        Pot: <span className="font-semibold">{pot} points</span>
      </div>

      <button
        onClick={onNewHand}
        className="text-sm px-3 py-1 rounded-md bg-sky-600 hover:bg-sky-500 text-white"
      >
        New Hand
      </button>

      <button
        onClick={onToggleShowAll}
        className="text-xs px-3 py-1 rounded-md border border-slate-500 text-slate-200 hover:bg-slate-800"
      >
        {devShowAll ? "他プレイヤーを隠す" : "他プレイヤーをオープン（デバッグ用）"}
      </button>

      {showdownText && (
        <div className="text-xs text-slate-300">{showdownText}</div>
      )}
    </div>
  );
}
