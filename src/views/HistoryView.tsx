import type { HandRecord } from "../game/history/recorder";
import ReplayPanel from "../components/ReplayPanel";

type Props = {
  history: HandRecord[];
  replayRecord: HandRecord | null;
  replayIndex: number;
  isReplaying: boolean;
  onSelectHand: (h: HandRecord) => void;
  onTogglePlay: () => void;
  onReset: () => void;
  onBack: () => void;
};

function HistoryView({
  history,
  replayRecord,
  replayIndex,
  isReplaying,
  onSelectHand,
  onTogglePlay,
  onReset,
  onBack,
}: Props) {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 inciso flex flex-col items-center p-4 gap-4">
      <div className="w-full max-w-3xl flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Hand History</h1>
          <p className="text-sm text-slate-300">Latest up to 5 hands from localStorage.</p>
        </div>
        <button
          onClick={onBack}
          className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-sm font-semibold"
        >
          Back to TOP
        </button>
      </div>

      <div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-slate-800/70 rounded-lg p-3 shadow">
          {history.length === 0 ? (
            <p className="text-sm text-slate-300">No hands recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {history.map((h) => (
                <button
                  key={h.handId}
                  onClick={() => onSelectHand(h)}
                  className="w-full text-left border border-slate-700 rounded-md px-3 py-2 bg-slate-800/60 hover:border-emerald-400 transition-colors"
                >
                  <div className="text-sm font-semibold">
                    Hand: <span className="text-emerald-300">{h.handId}</span>
                  </div>
                  <div className="text-xs text-slate-300">
                    Ended: {new Date(h.endedAt).toLocaleString()} / BTN: {h.btnIndex} / Pot: {h.pot} BB
                  </div>
                  <div className="text-xs text-slate-300">
                    Winners: {h.winners.map((w) => `P${w + 1}`).join(", ")}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bg-slate-800/70 rounded-lg p-3 shadow min-h-[200px]">
          <ReplayPanel
            record={replayRecord}
            replayIndex={replayIndex}
            isReplaying={isReplaying}
            onTogglePlay={onTogglePlay}
            onReset={onReset}
          />
        </div>
      </div>
    </div>
  );
}

export default HistoryView;
