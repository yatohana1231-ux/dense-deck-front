import type { HandRecord } from "../game/history/recorder";
import Card from "../components/Card";

type Props = {
  history: HandRecord[];
  onSelectHand: (h: HandRecord) => void;
  username?: string;
  onBack: () => void;
};

function HistoryView({
  history,
  onSelectHand,
  username,
  onBack,
}: Props) {
  const renderPreview = (h: HandRecord) => {
    const board = h.board ?? { flop: [], turn: undefined, river: undefined };
    const flop = board.flop ?? [];
    const turn = board.turn ? [board.turn] : [];
    const river = board.river ? [board.river] : [];
    const hero = h.holeCards?.[h.heroIndex ?? 2] ?? [];
    return (
      <div className="mt-2 flex flex-col gap-1 text-xs text-slate-200">
        <div className="flex items-center gap-1">
          {flop.concat(turn).concat(river).length === 0 ? (
            <span className="text-slate-400">No board</span>
          ) : (
            <div className="flex gap-1">
              {flop.concat(turn).concat(river).map((c, idx) => (
                <div key={`b-${idx}`} className="w-10">
                  <Card card={c} />
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          {hero.length === 0 ? (
            <span className="text-slate-400">Hero cards hidden</span>
          ) : (
            <div className="flex gap-1">
              {hero.map((c, idx) => (
                <div key={`h-${idx}`} className="w-10">
                  <Card card={c} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 inciso flex flex-col items-center p-4 gap-4">
      <div className="w-full max-w-4xl flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Hand History</h1>
          <p className="text-sm text-slate-300">
            Latest up to 5 hands from DB. {username ? `User: ${username}` : ""}
          </p>
        </div>
        <button
          onClick={onBack}
          className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-sm font-semibold"
        >
          Back to TOP
        </button>
      </div>

      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {history.length === 0 ? (
          <p className="text-sm text-slate-300">No hands recorded yet.</p>
        ) : (
          history.map((h) => (
            <button
              key={h.handId}
              onClick={() => onSelectHand(h)}
              className="w-full text-left border border-slate-700 rounded-md px-3 py-2 bg-slate-800/60 hover:border-emerald-400 transition-colors shadow"
            >
              <div className="text-sm font-semibold truncate">
                Hand: <span className="text-emerald-300">{h.handId}</span>
              </div>
              <div className="text-xs text-slate-300">
                BTN: {h.btnIndex} / Pot: {h.pot ?? 0} BB / Winners:{" "}
                {h.winners?.length ? h.winners.map((w) => `P${w + 1}`).join(", ") : "-"}
              </div>
              {renderPreview(h)}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

export default HistoryView;
