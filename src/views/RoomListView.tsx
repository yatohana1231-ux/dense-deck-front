import { useEffect, useState } from "react";
import type { RoomSummary, WsMessage } from "../api/ws.js";
import { connectRoomListWs } from "../api/ws.js";

type Props = {
  apiBase: string;
  onSelect: (roomId: string) => void;
  onJoin: (roomId: string) => void;
  onBack: () => void;
};

export default function RoomListView({ apiBase, onSelect, onJoin, onBack }: Props) {
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const ws = connectRoomListWs(apiBase, (msg: WsMessage) => {
      if (msg.type === "rooms") setRooms(msg.rooms);
    });
    return () => ws.close();
  }, [apiBase]);

  const createRoom = async () => {
    setCreating(true);
    try {
      const res = await fetch(`${apiBase}/api/rooms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: name || undefined,
          password: password || undefined,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as any;
      const room = (data?.room ?? data) as RoomSummary;
      if (!room?.id) {
        throw new Error("Invalid response from server");
      }
      setName("");
      setPassword("");
      setError(null);
      onJoin(room.id);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setCreating(false);
    }
  };

  const joinRoom = async (roomId: string, pw?: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/rooms/${roomId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password: pw || undefined }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setError(null);
      onJoin(roomId);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 inciso flex flex-col items-center p-4 gap-4">
      <div className="w-full max-w-4xl flex items-center justify-between">
        <h1 className="text-2xl font-bold">Rooms</h1>
        <button
          onClick={onBack}
          className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-sm font-semibold"
        >
          Back
        </button>
      </div>

      <div className="w-full max-w-4xl bg-slate-800/50 rounded-lg border border-slate-700 p-4 flex flex-col gap-2">
        <div className="text-sm font-semibold">Create Room</div>
        <div className="flex flex-col sm:flex-row gap-2 text-sm">
          <input
            type="text"
            placeholder="Room name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="px-3 py-2 rounded bg-slate-900 border border-slate-700 text-slate-100 flex-1"
          />
          <input
            type="password"
            placeholder="Password (optional)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="px-3 py-2 rounded bg-slate-900 border border-slate-700 text-slate-100 flex-1"
          />
          <button
            onClick={createRoom}
            disabled={creating || loading}
            className="px-3 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? "Creating..." : "Create"}
          </button>
        </div>
        {error && <div className="text-xs text-rose-400">{error}</div>}
      </div>

      <div className="w-full max-w-4xl bg-slate-800/50 rounded-lg border border-slate-700 divide-y divide-slate-700">
        {rooms.map((r) => (
          <div
            key={r.id}
            className="px-4 py-3 flex items-center justify-between hover:bg-slate-800 cursor-pointer"
            onClick={() => onSelect(r.id)}
          >
            <div className="flex flex-col">
              <span className="font-semibold">{r.name}</span>
              <span className="text-xs text-slate-400">
                {r.tag} / {r.state} / {r.seats.length}/{r.maxSeats} seats
              </span>
            </div>
            <div className="flex items-center gap-2">
              {r.hasPassword && <span className="text-xs text-rose-400">PW</span>}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  joinRoom(r.id);
                }}
                disabled={loading}
                className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Join
              </button>
            </div>
          </div>
        ))}
        {rooms.length === 0 && (
          <div className="px-4 py-6 text-center text-slate-400">No rooms</div>
        )}
      </div>
    </div>
  );
}
