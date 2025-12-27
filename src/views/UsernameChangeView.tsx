import { useState } from "react";
import type { AuthUser } from "../hooks/useAuth";

type Props = {
  apiBase: string;
  user: AuthUser;
  onSuccess: () => void;
  onBack: () => void;
};

export default function UsernameChangeView({ apiBase, user, onSuccess, onBack }: Props) {
  const [username, setUsername] = useState(user.username);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/user/username`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      if (!res.ok) {
        if (res.status === 409) throw new Error("Username is taken");
        const text = await res.text().catch(() => "");
        throw new Error(text || "Update failed");
      }
      onSuccess();
    } catch (e: any) {
      setError(e?.message ?? "Update failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 inciso flex flex-col items-center p-4 gap-4">
      <div className="w-full max-w-md flex items-center justify-between">
        <h1 className="text-2xl font-bold">Change Username</h1>
        <button
          onClick={onBack}
          className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-sm font-semibold"
        >
          Back
        </button>
      </div>
      <div className="w-full max-w-md bg-slate-800/70 rounded-lg p-4 border border-slate-700 space-y-3">
        <div className="text-xs text-slate-300">
          One-time change. Rules: up to 20 chars, a-z A-Z 0-9 _ . -
        </div>
        <input
          className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        {error && <div className="text-sm text-red-400">{error}</div>}
        <button
          onClick={submit}
          disabled={loading}
          className="w-full px-3 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold"
        >
          {loading ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}
