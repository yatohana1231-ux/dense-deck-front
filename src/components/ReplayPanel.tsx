import type { HandRecord } from "../game/history/recorder";

type Props = {
  record: HandRecord | null;
  replayIndex: number;
  isReplaying: boolean;
  onTogglePlay: () => void;
  onReset: () => void;
};

function ReplayPanel({
  record,
  replayIndex,
  isReplaying,
  onTogglePlay,
  onReset,
}: Props) {
  if (!record) {
    return <p className="text-sm text-slate-300">Select a hand to replay.</p>;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-semibold">
            Replaying: <span className="text-emerald-300">{record.handId}</span>
          </div>
          <div className="text-xs text-slate-300">
            BTN: {record.btnIndex} / Pot: {record.pot} BB / Actions: {record.actionLog.length}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onTogglePlay}
            className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-xs font-semibold"
          >
            {isReplaying ? "Pause" : "Play"}
          </button>
          <button
            onClick={onReset}
            className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-xs font-semibold"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="border border-slate-700 rounded h-[200px] overflow-y-auto text-xs">
        {record.actionLog.length === 0 ? (
          <div className="p-2 text-slate-300">No actions recorded.</div>
        ) : (
          record.actionLog.map((a, idx) => {
            const isActive = idx === replayIndex;
            return (
              <div
                key={`${a.order}-${a.playerIndex}`}
                className={`px-2 py-1 border-b border-slate-800 ${
                  isActive ? "bg-emerald-900/50 text-emerald-100" : "text-slate-200"
                }`}
              >
                #{idx + 1} [{a.street}] P{a.playerIndex + 1} {a.kind}
                {a.amount > 0 ? ` ${a.amount}BB` : ""} | pot {a.potAfter} | bet {a.betAfter} | stack {a.stackAfter}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default ReplayPanel;
