import { useState } from "react";

type Props = {
  apiBase: string;
  onBack: () => void;
  onSuccess: () => void;
};

export default function ResetFormView({ apiBase, onBack, onSuccess }: Props) {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (password !== confirm) {
      setError("Password confirmation does not match");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/api/password/reset/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      if (!res.ok) throw new Error("Reset failed");
      onSuccess();
    } catch (e: any) {
      setError(e?.message ?? "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 inciso flex flex-col items-center p-4 gap-4">
      <div className="w-full max-w-md flex items-center justify-between">
        <h1 className="text-2xl font-bold">Set New Password</h1>
        <button
          onClick={onBack}
          className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-sm font-semibold"
        >
          Back
        </button>
      </div>
      <div className="w-full max-w-md bg-slate-800/70 rounded-lg p-4 border border-slate-700 space-y-3">
        <div className="text-sm text-slate-300">Enter the reset token from your email and a new password.</div>
        <input
          className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Reset token"
        />
        <input
          className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          placeholder="New password"
        />
        <input
          className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          type="password"
          placeholder="Confirm password"
        />
        {error && <div className="text-sm text-red-400">{error}</div>}
        <button
          onClick={submit}
          disabled={loading}
          className="w-full px-3 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold"
        >
          {loading ? "Saving..." : "Save password"}
        </button>
      </div>
    </div>
  );
}
