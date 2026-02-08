import type { HandRecord } from "../game/history/recorder.js";
import Card from "../components/Card.js";

type Props = {
  history: HandRecord[];
  onSelectHand: (h: HandRecord) => void;
  username?: string;
  onBack: () => void;
  onArchive?: (h: HandRecord) => void;
  isLoggedIn?: boolean;
  page: number;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
};

function HistoryView({
  history,
  onSelectHand,
  username,
  onBack,
  onArchive,
  isLoggedIn = false,
  page,
  hasNext,
  onPrev,
  onNext,
}: Props) {
  const renderPreview = (h: HandRecord) => {
    const board = h.board ?? { flop: [], turn: undefined, river: undefined };
    const boardCards = [
      ...(board.flop ?? []),
      board.turn,
      board.river,
    ].filter(Boolean);
    const revealedCount =
      h.streetEnded === "preflop"
        ? 0
        : h.streetEnded === "flop"
          ? 3
          : h.streetEnded === "turn"
            ? 4
            : 5;
    const hero = h.holeCards?.[h.heroIndex ?? 2] ?? [];
    const boardSlots = Array.from({ length: 5 }).map((_, idx) =>
      idx < revealedCount ? boardCards[idx] ?? null : null
    );
    const isWin = h.winners?.includes(h.heroIndex ?? 2);
    const resultLabel = isWin ? "Win" : "Lose";
    return (
      <div className="mt-2 flex flex-col gap-2 text-xs text-slate-200">
        <div className={`text-sm font-semibold ${isWin ? "text-emerald-300" : "text-rose-300"}`}>
          {resultLabel}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {hero.length === 0 ? (
              <span className="text-slate-400">Hero cards hidden</span>
            ) : (
              hero.map((c, idx) => (
                <div key={`h-${idx}`} className="w-10">
                  <Card card={c} />
                </div>
              ))
            )}
          </div>
          <div className="text-slate-400">|</div>
          <div className="flex gap-1">
            {boardSlots.map((c, idx) => (
              <div key={`b-${idx}`} className="w-10">
                {c ? (
                  <Card card={c} />
                ) : (
                  <div className="w-10 h-14 rounded-lg border border-slate-700 bg-slate-800/60" />
                )}
              </div>
            ))}
          </div>
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
            {username ? `User: ${username}` : ""}
          </p>
        </div>
        <button
          onClick={onBack}
          className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-sm font-semibold"
        >
          Back to TOP
        </button>
      </div>

      <div className="w-full max-w-4xl flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <button
            onClick={onPrev}
            disabled={page === 1}
            className={`px-3 py-1.5 rounded text-sm font-semibold ${
              page === 1
                ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                : "bg-slate-700 hover:bg-slate-600"
            }`}
          >
            Prev
          </button>
          <div className="text-xs text-slate-400">Page {page}</div>
          <button
            onClick={onNext}
            disabled={!hasNext}
            className={`px-3 py-1.5 rounded text-sm font-semibold ${
              !hasNext
                ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                : "bg-slate-700 hover:bg-slate-600"
            }`}
          >
            Next
          </button>
        </div>
        {history.length === 0 ? (
          <p className="text-sm text-slate-300">No hands recorded yet.</p>
        ) : (
          history.map((h) => (
            <div
              key={h.handId}
              className="w-full border border-slate-700 rounded-md px-3 py-2 bg-slate-800/60 hover:border-emerald-400 transition-colors shadow"
            >
              <button onClick={() => onSelectHand(h)} className="w-full text-left">
                <div className="text-sm font-semibold truncate">
                  Hand: <span className="text-emerald-300">{h.handId}</span>
                </div>
                <div className="text-xs text-slate-300">
                  BTN: {h.btnIndex} / Pot: {h.pot ?? 0} BB / Winners:{" "}
                  {h.winners?.length ? h.winners.map((w) => `P${w + 1}`).join(", ") : "-"}
                </div>
                {renderPreview(h)}
              </button>
              {isLoggedIn && onArchive && (
                <div className="mt-2">
                  <button
                    onClick={() => onArchive(h)}
                    className="px-3 py-1 rounded bg-sky-600 hover:bg-sky-500 text-xs font-semibold"
                  >
                    Archive
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="w-full max-w-4xl flex items-center justify-between">
        <button
          onClick={onPrev}
          disabled={page === 1}
          className={`px-3 py-1.5 rounded text-sm font-semibold ${
            page === 1
              ? "bg-slate-800 text-slate-500 cursor-not-allowed"
              : "bg-slate-700 hover:bg-slate-600"
          }`}
        >
          Prev
        </button>
        <div className="text-xs text-slate-400">Page {page}</div>
        <button
          onClick={onNext}
          disabled={!hasNext}
          className={`px-3 py-1.5 rounded text-sm font-semibold ${
            !hasNext
              ? "bg-slate-800 text-slate-500 cursor-not-allowed"
              : "bg-slate-700 hover:bg-slate-600"
          }`}
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default HistoryView;

