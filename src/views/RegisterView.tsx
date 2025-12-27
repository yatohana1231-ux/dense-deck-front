import { useState } from "react";

type Props = {
  apiBase: string;
  onSuccess: () => void;
  onBack: () => void;
  onGoLogin: () => void;
};

export default function RegisterView({ apiBase, onSuccess, onBack, onGoLogin }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [username, setUsername] = useState("");
  const [later, setLater] = useState(false);
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
      const res = await fetch(`${apiBase}/api/auth/register`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, username: later ? undefined : username, later }),
      });
      if (!res.ok) {
        if (res.status === 409) throw new Error("Email or username already registered");
        throw new Error("Register failed");
      }
      onSuccess();
    } catch (e: any) {
      setError(e?.message ?? "Register failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 inciso flex flex-col items-center p-4 gap-4">
      <div className="w-full max-w-md flex items-center justify-between">
        <h1 className="text-2xl font-bold">Register</h1>
        <button
          onClick={onBack}
          className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-sm font-semibold"
        >
          Back
        </button>
      </div>
      <div className="w-full max-w-md bg-slate-800/70 rounded-lg p-4 border border-slate-700 space-y-3">
        <div className="flex flex-col gap-1">
          <label className="text-sm text-slate-300">Username</label>
          <input
            className={`border rounded px-3 py-2 text-sm ${
              later
                ? "bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed"
                : "bg-slate-900 border-slate-700 text-slate-100"
            }`}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={later}
            placeholder="Player-XXXX (optional)"
          />
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={later}
              onChange={(e) => setLater(e.target.checked)}
            />
            <span>Set later (use default for now)</span>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm text-slate-300">Email</label>
          <input
            className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm text-slate-300">Password</label>
          <input
            className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm text-slate-300">Confirm Password</label>
          <input
            className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            type="password"
          />
        </div>
        {error && <div className="text-sm text-red-400">{error}</div>}
        <button
          onClick={submit}
          disabled={loading}
          className="w-full px-3 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold"
        >
          {loading ? "Registering..." : "Register"}
        </button>
        <div className="flex justify-end text-xs text-slate-300">
          <button onClick={onGoLogin} className="underline">
            Already registered? Login
          </button>
        </div>
      </div>
    </div>
  );
}
