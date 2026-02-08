import { useEffect, useState } from "react";
import type { HandRecord } from "../game/history/recorder.js";
import type { GalleryListItem } from "../api/gallery.js";
import { getGalleryTags, listGalleryPosts } from "../api/gallery.js";
import HandCard from "./HandCard.js";
import { mapReplayToRecord } from "./handReplayToRecord.js";

type Props = {
  apiBase: string;
  history: HandRecord[];
  onSelectHand: (h: HandRecord) => void;
  username?: string;
  onBack: () => void;
  onGallery?: (h: HandRecord) => void;
  isLoggedIn?: boolean;
  onOpenGallery?: (postId: string) => void;
  tab: "history" | "gallery" | "museum";
  onTabChange: (t: "history" | "gallery" | "museum") => void;
  page: number;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
};

function HistoryView({
  apiBase,
  history,
  onSelectHand,
  username,
  onBack,
  onGallery,
  isLoggedIn = false,
  onOpenGallery,
  tab,
  onTabChange,
  page,
  hasNext,
  onPrev,
  onNext,
}: Props) {
  const [galleryItems, setGalleryItems] = useState<GalleryListItem[]>([]);
  const [galleryTags, setGalleryTags] = useState<Array<{ key: string; label: string }>>([]);
  const [galleryTagFilter, setGalleryTagFilter] = useState("");
  const [galleryPage, setGalleryPage] = useState(1);
  const [galleryLoading, setGalleryLoading] = useState(false);

  useEffect(() => {
    if (tab !== "gallery") return;
    getGalleryTags(apiBase)
      .then((data) => setGalleryTags(data.authorFixedTags ?? []))
      .catch(() => {});
  }, [apiBase, tab]);

  useEffect(() => {
    if (tab !== "gallery") return;
    setGalleryLoading(true);
    listGalleryPosts(apiBase, { tag: galleryTagFilter || undefined, page: galleryPage, limit: 20 })
      .then((res) => setGalleryItems(res.items ?? []))
      .finally(() => setGalleryLoading(false));
  }, [apiBase, tab, galleryTagFilter, galleryPage]);
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
        <div className="flex items-center gap-2">
          {(["history", "gallery", "museum"] as const).map((t) => (
            <button
              key={t}
              onClick={() => t !== "museum" && onTabChange(t)}
              disabled={t === "museum"}
              className={`px-3 py-1.5 rounded text-sm font-semibold ${
                t === tab
                  ? "bg-emerald-600 text-white"
                  : t === "museum"
                  ? "bg-slate-800 text-slate-600 cursor-not-allowed"
                  : "bg-slate-700 hover:bg-slate-600"
              }`}
            >
              {t === "history" ? "History" : t === "gallery" ? "Gallery" : "Museum"}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={tab === "gallery" ? () => setGalleryPage((p) => Math.max(1, p - 1)) : onPrev}
            disabled={tab === "gallery" ? galleryPage === 1 : page === 1}
            className={`px-3 py-1.5 rounded text-sm font-semibold ${
              (tab === "gallery" ? galleryPage === 1 : page === 1)
                ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                : "bg-slate-700 hover:bg-slate-600"
            }`}
          >
            Prev
          </button>
          <div className="text-xs text-slate-400">
            Page {tab === "gallery" ? galleryPage : page}
          </div>
          <button
            onClick={tab === "gallery" ? () => setGalleryPage((p) => p + 1) : onNext}
            disabled={tab === "gallery" ? false : !hasNext}
            className={`px-3 py-1.5 rounded text-sm font-semibold ${
              tab === "gallery" ? "bg-slate-700 hover:bg-slate-600" : !hasNext
                ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                : "bg-slate-700 hover:bg-slate-600"
            }`}
          >
            Next
          </button>
        </div>
        {tab === "history" && (
          <>
            {history.length === 0 ? (
              <p className="text-sm text-slate-300">No hands recorded yet.</p>
            ) : (
              history.map((h) => (
                <HandCard
                  key={h.handId}
                  record={h}
                  onClick={() => onSelectHand(h)}
                  actions={
                    isLoggedIn && onGallery ? (
                      <button
                        onClick={() => onGallery(h)}
                        className="px-3 py-1 rounded bg-sky-600 hover:bg-sky-500 text-xs font-semibold"
                      >
                        Gallery
                      </button>
                    ) : null
                  }
                />
              ))
            )}
          </>
        )}

        {tab === "gallery" && (
          <>
            <div className="w-full bg-slate-800/60 rounded-lg border border-slate-700 p-3 flex items-center gap-2">
              <span className="text-xs text-slate-300">Filter</span>
              <select
                value={galleryTagFilter}
                onChange={(e) => {
                  setGalleryPage(1);
                  setGalleryTagFilter(e.target.value);
                }}
                className="bg-slate-900 border border-slate-700 text-sm rounded px-2 py-1"
              >
                <option value="">All</option>
                {galleryTags.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            {galleryLoading && <p className="text-sm text-slate-300">Loading...</p>}
            {!galleryLoading && galleryItems.length === 0 && (
              <p className="text-sm text-slate-300">No gallery posts yet.</p>
            )}
            {!galleryLoading &&
              galleryItems.map((p) => (
                (() => {
                  const record = mapReplayToRecord(p.handReplay);
                  if (!record) {
                    return (
                      <div
                        key={p.postId}
                        className="w-full border border-slate-700 rounded-md px-3 py-2 bg-slate-800/60 shadow"
                      >
                        <div className="text-sm font-semibold truncate">{p.title || "(untitled)"}</div>
                        <div className="text-xs text-slate-400">Hand data unavailable</div>
                      </div>
                    );
                  }
                  return (
                    <HandCard
                      key={p.postId}
                      record={record}
                      onClick={() => onOpenGallery?.(p.postId)}
                      footer={
                        <>
                          <div className="text-xs text-slate-300">
                            Tags: {p.authorTags.fixed.join(", ") || "-"}
                          </div>
                          <div className="text-xs text-slate-400">
                            Free: {p.authorTags.free.join(", ") || "-"}
                          </div>
                        </>
                      }
                    />
                  );
                })()
              ))}
          </>
        )}

        {tab === "museum" && (
          <p className="text-sm text-slate-400">Museum is not available in MVP.</p>
        )}
      </div>

      <div className="w-full max-w-4xl flex items-center justify-between">
        <button
          onClick={tab === "gallery" ? () => setGalleryPage((p) => Math.max(1, p - 1)) : onPrev}
          disabled={tab === "gallery" ? galleryPage === 1 : page === 1}
          className={`px-3 py-1.5 rounded text-sm font-semibold ${
            (tab === "gallery" ? galleryPage === 1 : page === 1)
              ? "bg-slate-800 text-slate-500 cursor-not-allowed"
              : "bg-slate-700 hover:bg-slate-600"
          }`}
        >
          Prev
        </button>
        <div className="text-xs text-slate-400">
          Page {tab === "gallery" ? galleryPage : page}
        </div>
        <button
          onClick={tab === "gallery" ? () => setGalleryPage((p) => p + 1) : onNext}
          disabled={tab === "gallery" ? false : !hasNext}
          className={`px-3 py-1.5 rounded text-sm font-semibold ${
            tab === "gallery" ? "bg-slate-700 hover:bg-slate-600" : !hasNext
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

