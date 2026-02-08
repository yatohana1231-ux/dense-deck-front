import { useEffect, useMemo, useRef, useState } from "react";
import type { ArchiveDetail, ArchiveTags } from "../api/archive.js";
import {
  getArchiveDetail,
  getArchiveTags,
  likeArchivePost,
  unlikeArchivePost,
  updateViewerTags,
  withdrawArchivePost,
  viewEnd,
  viewStart,
} from "../api/archive.js";
import type { HandRecord } from "../game/history/recorder.js";
import ReplayView from "./ReplayView.js";
import { getViewerAnonId } from "../utils/viewerAnonId.js";

type Props = {
  apiBase: string;
  postId: string;
  isLoggedIn: boolean;
  onBack: () => void;
  onEdit: (detail: ArchiveDetail) => void;
};

function mapReplayToRecord(replay: any): HandRecord | null {
  if (!replay) return null;
  if (Array.isArray(replay.boardCards)) {
    const cards = replay.boardCards as any[];
    const flop = cards.slice(0, 3);
    const turn = cards[3];
    const river = cards[4];
    const participants = Array.isArray(replay.participants) ? replay.participants : [];
    const seatCount = replay.maxPlayers ?? participants.length;
    const holeCards = Array.from({ length: seatCount }).map((_, idx) => {
      const p = participants.find((pp: any) => pp.seat === idx);
      return p?.holeCards ?? [];
    });
    return {
      handId: replay.handId,
      startedAt: replay.handStartedAt ? new Date(replay.handStartedAt).getTime() : Date.now(),
      endedAt: replay.playedAt ? new Date(replay.playedAt).getTime() : Date.now(),
      btnIndex: replay.buttonSeat ?? 0,
      heroIndex: 0,
      streetEnded: replay.result?.streetEnded ?? "showdown",
      autoWin: replay.result?.autoWin ?? null,
      participants: participants.map((p: any) => ({
        seat: p.seat,
        userId: p.userId ?? null,
        username: p.username ?? null,
        showedHoleCards: p.showedHoleCards ?? null,
        foldedStreet: p.foldedStreet ?? null,
      })),
      board: { flop, turn, river },
      holeCards,
      initialStacks: replay.initialStacks ?? [],
      finalStacks: replay.finalStacks ?? [],
      actionLog: replay.actions ?? [],
      winners: replay.result?.winners ?? [],
      handValues: replay.result?.handValues ?? [],
      seatCount,
      pot: replay.result?.pot ?? 0,
    };
  }
  return null;
}

export default function ArchiveDetailView({
  apiBase,
  postId,
  isLoggedIn,
  onBack,
  onEdit,
}: Props) {
  const [detail, setDetail] = useState<ArchiveDetail | null>(null);
  const [tags, setTags] = useState<ArchiveTags | null>(null);
  const [like, setLike] = useState(false);
  const [loading, setLoading] = useState(true);
  const viewSessionRef = useRef<string | null>(null);
  const viewStartRef = useRef<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const d = await getArchiveDetail(apiBase, postId);
      setDetail(d);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    getArchiveTags(apiBase).then(setTags).catch(() => {});
  }, [apiBase, postId]);

  useEffect(() => {
    const run = async () => {
      const viewerAnonId = isLoggedIn ? undefined : getViewerAnonId();
      const res = await viewStart(apiBase, postId, viewerAnonId).catch(() => null);
      if (res?.viewSessionId) {
        viewSessionRef.current = res.viewSessionId;
        viewStartRef.current = Date.now();
      }
    };
    run();
    return () => {
      const viewSessionId = viewSessionRef.current;
      const startedAt = viewStartRef.current;
      if (viewSessionId && startedAt) {
        const dwellMs = Date.now() - startedAt;
        void viewEnd(apiBase, postId, viewSessionId, dwellMs);
      }
    };
  }, [apiBase, postId, isLoggedIn]);

  const record = useMemo(() => mapReplayToRecord(detail?.handReplay), [detail?.handReplay]);

  const viewerTags = tags?.viewerTags ?? [];
  const mine = detail?.viewerTags?.mine ?? [];

  const toggleLike = async () => {
    if (!isLoggedIn || detail?.isOwner) return;
    if (like) {
      await unlikeArchivePost(apiBase, postId);
      setLike(false);
    } else {
      await likeArchivePost(apiBase, postId);
      setLike(true);
    }
  };

  const updateTags = async (next: string[]) => {
    await updateViewerTags(apiBase, postId, next);
    setDetail((prev) =>
      prev
        ? {
            ...prev,
            viewerTags: { ...prev.viewerTags, mine: next },
          }
        : prev
    );
  };

  const toggleViewerTag = async (key: string) => {
    const next = mine.includes(key) ? mine.filter((k) => k !== key) : [...mine, key];
    if (next.length > 3) return;
    await updateTags(next);
  };

  const withdraw = async () => {
    await withdrawArchivePost(apiBase, postId);
    onBack();
  };

  if (loading || !detail) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 inciso flex items-center justify-center">
        <div className="text-sm text-slate-300">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 inciso flex flex-col items-center p-4 gap-4">
      <div className="w-full max-w-5xl flex items-center justify-between">
        <h1 className="text-2xl font-bold">Archive Detail</h1>
        <div className="flex gap-2">
          {detail.isOwner && (
            <button
              onClick={() => onEdit(detail)}
              className="px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-sm font-semibold"
            >
              Edit
            </button>
          )}
          <button
            onClick={onBack}
            className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-sm font-semibold"
          >
            Back
          </button>
        </div>
      </div>

      <div className="w-full max-w-5xl bg-slate-800/60 rounded-lg border border-slate-700 p-4 space-y-2">
        <div className="text-xl font-semibold">{detail.title || "(untitled)"}</div>
        <div className="text-xs text-slate-400">
          Focus: {detail.focusPoint ?? "-"} / Status: {detail.status ?? "active"}
        </div>
        <div className="text-xs text-slate-300">
          Tags: {detail.authorTags.fixed.join(", ") || "-"}
        </div>
        <div className="text-xs text-slate-400">Free: {detail.authorTags.free.join(", ") || "-"}</div>
        {detail.isOwner && detail.privateNote && (
          <div className="text-sm text-slate-200 whitespace-pre-wrap">{detail.privateNote}</div>
        )}
        {!detail.isOwner && isLoggedIn && (
          <button
            onClick={toggleLike}
            className="mt-2 px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold"
          >
            {like ? "Unlike" : "Like"}
          </button>
        )}
        {detail.isOwner && (
          <div className="text-xs text-slate-400">
            Like: {detail.metrics?.likeCount ?? 0} / Views: {detail.metrics?.viewsTotal ?? 0} / Unique:{" "}
            {detail.metrics?.viewsUnique ?? 0}
          </div>
        )}
      </div>

      {record && <ReplayView record={record} onBack={onBack} />}

      <div className="w-full max-w-5xl bg-slate-800/60 rounded-lg border border-slate-700 p-4 space-y-2">
        <div className="text-sm font-semibold">Viewer Tags</div>
        {!isLoggedIn && <div className="text-xs text-slate-400">Login required.</div>}
        {isLoggedIn && (
          <div className="flex flex-wrap gap-2">
            {viewerTags.map((t) => (
              <label
                key={t.key}
                className={`px-2 py-1 rounded text-xs border cursor-pointer ${
                  mine.includes(t.key)
                    ? "bg-emerald-600/40 border-emerald-500 text-emerald-100"
                    : "bg-slate-900 border-slate-700 text-slate-300"
                }`}
              >
                <input
                  type="checkbox"
                  checked={mine.includes(t.key)}
                  onChange={() => toggleViewerTag(t.key)}
                  className="mr-1"
                />
                {t.label}
              </label>
            ))}
          </div>
        )}
      </div>

      {detail.isOwner && (
        <div className="w-full max-w-5xl flex justify-end">
          <button
            onClick={withdraw}
            className="px-4 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-sm font-semibold"
          >
            Withdraw
          </button>
        </div>
      )}
    </div>
  );
}
