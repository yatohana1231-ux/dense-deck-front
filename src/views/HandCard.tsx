import type { ReactNode } from "react";
import type { HandRecord } from "../game/history/recorder.js";
import Card from "../components/Card.js";

type Props = {
  record: HandRecord;
  onClick?: () => void;
  footer?: ReactNode;
  actions?: ReactNode;
};

export default function HandCard({ record, onClick, footer, actions }: Props) {
  const board = record.board ?? { flop: [], turn: undefined, river: undefined };
  const boardCards = [...(board.flop ?? []), board.turn, board.river].filter(Boolean);
  const revealedCount =
    record.streetEnded === "preflop"
      ? 0
      : record.streetEnded === "flop"
        ? 3
        : record.streetEnded === "turn"
          ? 4
          : 5;
  const hero = record.holeCards?.[record.heroIndex ?? 2] ?? [];
  const boardSlots = Array.from({ length: 5 }).map((_, idx) =>
    idx < revealedCount ? boardCards[idx] ?? null : null
  );
  const isWin = record.winners?.includes(record.heroIndex ?? 2);
  const resultLabel = isWin ? "Win" : "Lose";

  const body = (
    <>
      <div className="text-sm font-semibold truncate">
        Hand: <span className="text-emerald-300">{record.handId}</span>
      </div>
      <div className="text-xs text-slate-300">
        BTN: {record.btnIndex} / Pot: {record.pot ?? 0} points / Winners:{" "}
        {record.winners?.length ? record.winners.map((w) => `P${w + 1}`).join(", ") : "-"}
      </div>
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
      {footer ? <div className="mt-2">{footer}</div> : null}
    </>
  );

  return (
    <div className="w-full border border-slate-700 rounded-md px-3 py-2 bg-slate-800/60 hover:border-emerald-400 transition-colors shadow">
      {onClick ? (
        <button onClick={onClick} className="w-full text-left">
          {body}
        </button>
      ) : (
        <div>{body}</div>
      )}
      {actions ? <div className="mt-2">{actions}</div> : null}
    </div>
  );
}
