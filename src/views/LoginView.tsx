import { useState } from "react";

type Props = {
  apiBase: string;
  onSuccess: () => void;
  onBack: () => void;
  onGoRegister: () => void;
  onGoReset: () => void;
};

export default function LoginView({ apiBase, onSuccess, onBack, onGoRegister, onGoReset }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/api/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) throw new Error("Login failed");
      onSuccess();
    } catch (e: any) {
      setError("Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 inciso flex flex-col items-center p-4 gap-4">
      <div className="w-full max-w-md flex items-center justify-between">
        <h1 className="text-2xl font-bold">Login</h1>
        <button
          onClick={onBack}
          className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-sm font-semibold"
        >
          Back
        </button>
      </div>
      <div className="w-full max-w-md bg-slate-800/70 rounded-lg p-4 border border-slate-700 space-y-3">
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
        {error && <div className="text-sm text-red-400">{error}</div>}
        <button
          onClick={submit}
          disabled={loading}
          className="w-full px-3 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold"
        >
          {loading ? "Logging in..." : "Login"}
        </button>
        <div className="flex justify-between text-xs text-slate-300">
          <button onClick={onGoRegister} className="underline">
            New account
          </button>
          <button onClick={onGoReset} className="underline">
            Forgot password
          </button>
        </div>
      </div>
    </div>
  );
}
