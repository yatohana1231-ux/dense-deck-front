import { useState } from "react";

type Props = {
  apiBase: string;
  onBack: () => void;
  onDone: () => void;
};

export default function ResetRequestView({ apiBase, onBack, onDone }: Props) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await fetch(`${apiBase}/api/password/reset/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } catch {}
    setLoading(false);
    onDone();
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 inciso flex flex-col items-center p-4 gap-4">
      <div className="w-full max-w-md flex items-center justify-between">
        <h1 className="text-2xl font-bold">Password Reset</h1>
        <button
          onClick={onBack}
          className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-sm font-semibold"
        >
          Back
        </button>
      </div>
      <div className="w-full max-w-md bg-slate-800/70 rounded-lg p-4 border border-slate-700 space-y-3">
        <div className="text-sm text-slate-300">Enter your email to receive a reset link.</div>
        <input
          className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
        />
        <button
          onClick={submit}
          disabled={loading}
          className="w-full px-3 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold"
        >
          {loading ? "Sending..." : "Send reset link"}
        </button>
      </div>
    </div>
  );
}
