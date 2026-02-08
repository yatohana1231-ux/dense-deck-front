import { useEffect, useMemo, useState } from "react";
import type { ArchiveTags } from "../api/archive.js";
import { createArchivePost, getArchiveTags, updateArchivePost } from "../api/archive.js";

type Props = {
  apiBase: string;
  handId: string;
  onCreated: (postId: string) => void;
  onBack: () => void;
  editPostId?: string;
  initial?: {
    title?: string;
    privateNote?: string;
    fixedTags?: string[];
    freeTags?: string[];
    focusPoint?: string | null;
  };
};

export default function ArchiveCreateView({
  apiBase,
  handId,
  onCreated,
  onBack,
  editPostId,
  initial,
}: Props) {
  const [tags, setTags] = useState<ArchiveTags | null>(null);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [privateNote, setPrivateNote] = useState(initial?.privateNote ?? "");
  const [fixedTagKeys, setFixedTagKeys] = useState<string[]>(initial?.fixedTags ?? []);
  const [freeTags, setFreeTags] = useState<string[]>(initial?.freeTags ?? ["", ""]);
  const [focusPoint, setFocusPoint] = useState<string | null>(initial?.focusPoint ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getArchiveTags(apiBase).then(setTags).catch(() => {});
  }, [apiBase]);

  const fixedTags = tags?.authorFixedTags ?? [];
  const focusOptions = tags?.focusPoints ?? [
    { key: "Preflop", label: "Preflop" },
    { key: "Flop", label: "Flop" },
    { key: "Turn", label: "Turn" },
    { key: "River", label: "River" },
  ];

  const canSubmit = useMemo(() => !saving && !!handId, [saving, handId]);

  const toggleFixed = (key: string) => {
    setFixedTagKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        handId,
        title: title || undefined,
        privateNote: privateNote || undefined,
        fixedTagKeys,
        freeTags: freeTags.map((t) => t.trim()).filter((t) => t.length > 0),
        focusPoint: focusPoint || null,
      };
      if (editPostId) {
        await updateArchivePost(apiBase, editPostId, {
          title: payload.title,
          privateNote: payload.privateNote,
          fixedTagKeys: payload.fixedTagKeys,
          freeTags: payload.freeTags,
        });
        onCreated(editPostId);
      } else {
        const res = (await createArchivePost(apiBase, payload)) as { postId: string };
        onCreated(res.postId);
      }
    } catch (e: any) {
      const payload = e?.payload;
      setError(payload?.error?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 inciso flex flex-col items-center p-4 gap-4">
      <div className="w-full max-w-4xl flex items-center justify-between">
        <h1 className="text-2xl font-bold">{editPostId ? "Edit Archive" : "Create Archive"}</h1>
        <button
          onClick={onBack}
          className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-sm font-semibold"
        >
          Back
        </button>
      </div>

      {error && <div className="text-sm text-rose-400">{error}</div>}
      {!handId && (
        <div className="text-sm text-amber-300">
          Hand not selected. Please create from Hand History.
        </div>
      )}

      <div className="w-full max-w-4xl bg-slate-800/60 rounded-lg border border-slate-700 p-4 space-y-4">
        <div className="text-sm font-semibold">Meta</div>
        <div className="flex flex-col gap-2">
          <label className="text-xs text-slate-300">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs text-slate-300">Private Note</label>
          <textarea
            value={privateNote}
            onChange={(e) => setPrivateNote(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm min-h-[120px]"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs text-slate-300">Focus Point</label>
          <select
            value={focusPoint ?? ""}
            onChange={(e) => setFocusPoint(e.target.value || null)}
            className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm"
          >
            <option value="">None</option>
            {focusOptions.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="w-full max-w-4xl bg-slate-800/60 rounded-lg border border-slate-700 p-4 space-y-4">
        <div className="text-sm font-semibold">Author Tags (Fixed)</div>
        <div className="flex flex-wrap gap-2">
          {fixedTags.map((t) => (
            <label
              key={t.key}
              className={`px-2 py-1 rounded text-xs border cursor-pointer ${
                fixedTagKeys.includes(t.key)
                  ? "bg-emerald-600/40 border-emerald-500 text-emerald-100"
                  : "bg-slate-900 border-slate-700 text-slate-300"
              }`}
            >
              <input
                type="checkbox"
                checked={fixedTagKeys.includes(t.key)}
                onChange={() => toggleFixed(t.key)}
                className="mr-1"
              />
              {t.label}
            </label>
          ))}
        </div>

        <div className="text-sm font-semibold">Free Tags</div>
        <div className="flex flex-col gap-2">
          {freeTags.map((t, idx) => (
            <input
              key={idx}
              value={t}
              onChange={(e) => {
                const next = [...freeTags];
                next[idx] = e.target.value;
                setFreeTags(next);
              }}
              className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm"
              placeholder={`Tag ${idx + 1}`}
            />
          ))}
        </div>
      </div>

      <div className="w-full max-w-4xl flex justify-end">
        <button
          onClick={submit}
          disabled={!canSubmit}
          className={`px-5 py-2 rounded text-sm font-semibold ${
            saving ? "bg-slate-700 text-slate-400" : "bg-emerald-600 hover:bg-emerald-500"
          }`}
        >
          {saving ? "Saving..." : editPostId ? "Save" : "Create"}
        </button>
      </div>
    </div>
  );
}
