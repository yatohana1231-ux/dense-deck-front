import type { ReactNode } from "react";
import Card from "../components/Card.js";
import type { HandCardViewModel } from "./handCardViewModel.js";

type Props = {
  model: HandCardViewModel;
  onClick?: () => void;
  actions?: ReactNode;
};

function formatTimestamp(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatChipDelta(value: number | null) {
  if (value === null) return "-";
  return `${value > 0 ? "+" : ""}${value} points`;
}

function resultTone(resultLabel: HandCardViewModel["resultLabel"]) {
  if (resultLabel === "Win") return "text-emerald-300";
  if (resultLabel === "Chop") return "text-amber-300";
  return "text-rose-300";
}

export default function HandCard({ model, onClick, actions }: Props) {
  const createdAt = formatTimestamp(model.createdAt);
  const hasTitle = Boolean(model.title);
  const showAuthorTags = model.authorTags !== undefined;
  const showViewerTags = model.viewerTags !== undefined;

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold truncate text-slate-100">{model.playerName}</div>
          {hasTitle ? <div className="text-sm text-emerald-300 truncate">{model.title}</div> : null}
        </div>
        {createdAt ? <div className="shrink-0 text-xs text-slate-400">{createdAt}</div> : null}
      </div>

      <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-300">
        <div className={`text-sm font-semibold ${resultTone(model.resultLabel)}`}>{model.resultLabel}</div>
        <div className="font-semibold text-slate-100">{formatChipDelta(model.chipDelta)}</div>
      </div>
      <div className="mt-2 flex items-start gap-3 text-xs text-slate-200">
        <div className="w-16 shrink-0 text-slate-400">{model.positionLabel}</div>
        <div className="flex min-w-0 items-start gap-2">
          <div className="flex items-center gap-1">
            <span className="shrink-0 text-slate-400">Hand</span>
            <div className="flex gap-1">
              {model.handCards.length === 0 ? (
                <span className="text-slate-500">Hidden</span>
              ) : (
                model.handCards.map((card, idx) => (
                  <div key={`h-${idx}`} className="w-10">
                    <Card card={card} />
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span className="shrink-0 text-slate-400">Board</span>
            <div className="flex gap-1">
              {model.boardCards.map((card, idx) => (
                <div key={`b-${idx}`} className="w-10">
                  {card ? (
                    <Card card={card} />
                  ) : (
                    <div className="h-14 w-10 rounded-lg border border-slate-700 bg-slate-800/60" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showAuthorTags ? (
        <div className="mt-2 text-xs text-slate-300">
          Author Tags: {model.authorTags && model.authorTags.length > 0 ? model.authorTags.join(", ") : "-"}
        </div>
      ) : null}

      {showViewerTags ? (
        <div className="mt-1 text-xs text-slate-400">
          Viewer Tags: {model.viewerTags && model.viewerTags.length > 0 ? model.viewerTags.join(", ") : "-"}
        </div>
      ) : null}
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
