import { useEffect, useState } from "react";
import type { GalleryListItem } from "../api/gallery.js";
import { getGalleryTags, listGalleryPosts } from "../api/gallery.js";
import HandCard from "./HandCard.js";
import { mapReplayToRecord } from "./handReplayToRecord.js";

type Props = {
  apiBase: string;
  onOpen: (postId: string) => void;
  onCreate?: () => void;
  onBack: () => void;
  isLoggedIn: boolean;
};

export default function GalleryListView({ apiBase, onOpen, onCreate, onBack, isLoggedIn }: Props) {
  const [items, setItems] = useState<GalleryListItem[]>([]);
  const [tagFilter, setTagFilter] = useState<string>("");
  const [tags, setTags] = useState<Array<{ key: string; label: string }>>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getGalleryTags(apiBase)
      .then((data) => setTags(data.authorFixedTags ?? []))
      .catch(() => {});
  }, [apiBase]);

  useEffect(() => {
    setLoading(true);
    listGalleryPosts(apiBase, { tag: tagFilter || undefined, page, limit: 20 })
      .then((res) => setItems(res.items ?? []))
      .finally(() => setLoading(false));
  }, [apiBase, tagFilter, page]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 inciso flex flex-col items-center p-4 gap-4">
      <div className="w-full max-w-5xl flex items-center justify-between">
        <h1 className="text-2xl font-bold">Hand Gallery</h1>
        <div className="flex gap-2">
          {isLoggedIn && onCreate && (
            <button
              onClick={onCreate}
              className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold"
            >
              New Post
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

      <div className="w-full max-w-5xl bg-slate-800/60 rounded-lg border border-slate-700 p-3 flex items-center gap-2">
        <span className="text-xs text-slate-300">Filter</span>
        <select
          value={tagFilter}
          onChange={(e) => {
            setPage(1);
            setTagFilter(e.target.value);
          }}
          className="bg-slate-900 border border-slate-700 text-sm rounded px-2 py-1"
        >
          <option value="">All</option>
          {tags.map((t) => (
            <option key={t.key} value={t.key}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div className="w-full max-w-5xl flex flex-col gap-3">
        {loading && <div className="p-4 text-sm text-slate-400">Loading...</div>}
        {!loading && items.length === 0 && (
          <div className="p-6 text-sm text-slate-400 text-center">No gallery posts</div>
        )}
        {items.map((p) => (
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
                onClick={() => onOpen(p.postId)}
                footer={
                  <div className="text-xs text-slate-400">
                    Tags: {p.authorTags.fixed.join(", ") || "-"} / Focus: {p.focusPoint ?? "-"}
                  </div>
                }
              />
            );
          })()
        ))}
      </div>

      <div className="w-full max-w-5xl flex items-center justify-between">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          className={`px-3 py-1.5 rounded text-sm font-semibold ${
            page === 1 ? "bg-slate-800 text-slate-500" : "bg-slate-700 hover:bg-slate-600"
          }`}
        >
          Prev
        </button>
        <div className="text-xs text-slate-400">Page {page}</div>
        <button
          onClick={() => setPage((p) => p + 1)}
          className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-sm font-semibold"
        >
          Next
        </button>
      </div>
    </div>
  );
}
