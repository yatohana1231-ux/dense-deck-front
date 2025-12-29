import { useState } from "react";
import { useRoomState } from "../hooks/useRoomState.js";
import { useAuth } from "../hooks/useAuth.js";

type Props = {
  apiBase: string;
  roomId: string;
  onBack: () => void;
  onEnterTable: () => void;
};

async function postJson(url: string, body: any) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}

export default function RoomDetailView({ apiBase, roomId, onBack, onEnterTable }: Props) {
  const { room, error: wsError } = useRoomState(apiBase, roomId);
  const auth = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const heroUserId = auth.user?.userId ?? "";
  const heroSeatIndex = room?.seats.findIndex((s) => s.userId === heroUserId) ?? -1;
  const isSeated = heroSeatIndex >= 0;
  const seatCount = room?.seats?.length ?? 0;
  const maxSeats = room?.maxSeats ?? 4;
  const neededPlayers = Math.max(0, 2 - seatCount);

  const join = async () => {
    setLoading(true);
    try {
      await postJson(`${apiBase}/api/rooms/${roomId}/join`, {});
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  const leave = async () => {
    setLoading(true);
    try {
      await postJson(`${apiBase}/api/rooms/${roomId}/leave`, {});
      setError(null);
      onBack();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  const start = async () => {
    setLoading(true);
    try {
      await postJson(`${apiBase}/api/rooms/${roomId}/start`, {});
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 inciso flex flex-col items-center p-4 gap-4">
      <div className="w-full max-w-4xl flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Room Detail</h1>
          <p className="text-xs text-slate-400">ID: {roomId}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onBack}
            className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-sm font-semibold"
          >
            Back
          </button>
          <button
            onClick={leave}
            disabled={loading}
            className="px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-sm font-semibold"
          >
            Leave
          </button>
        </div>
      </div>

      {(error || wsError) && <div className="text-sm text-rose-400">{error ?? wsError}</div>}

      <div className="w-full max-w-4xl bg-slate-800/50 rounded-lg border border-slate-700 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold">{room?.name ?? "..."}</div>
            <div className="text-xs text-slate-400">
              {room?.tag} / {room?.state} / {room?.seats.length ?? 0}/{room?.maxSeats ?? 0} seats
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={join}
              disabled={loading || isSeated}
              className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSeated ? "Joined" : "Join"}
            </button>
            <button
              onClick={onEnterTable}
              disabled={!isSeated}
              className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Enter Table
            </button>
            <button
              onClick={start}
              disabled={loading || neededPlayers > 0}
              className="px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Start
            </button>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-300">
          <div>Initial Stack: {room?.config.initialStackBB ?? 0} BB</div>
          <div>Action Timer: {room?.config.actionSeconds ?? 0}s</div>
          <div>Reconnect Grace: {room?.config.reconnectGraceSeconds ?? 0}s</div>
          <div>Rebuy: {room?.config.rebuyAmount ?? 0} BB</div>
        </div>
        {neededPlayers > 0 && (
          <div className="mt-2 text-xs text-amber-300">
            Need {neededPlayers} more player{neededPlayers === 1 ? "" : "s"} seated to start a hand.
          </div>
        )}

        <div className="mt-4">
          <div className="text-sm font-semibold mb-1">Seats</div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {Array.from({ length: maxSeats }).map((_, idx) => {
              const seat = room?.seats?.find((s) => s.seatIndex === idx);
              return (
                <div
                  key={idx}
                  className="p-2 rounded bg-slate-700/50 border border-slate-700 flex justify-between items-center"
                >
                  <div>
                    <div className="font-semibold">
                      {seat ? seat.username : `Empty Seat ${idx}`}
                    </div>
                    <div className="text-xs text-slate-400">
                      Stack: {seat?.stack ?? 0} / Seat: {idx}
                    </div>
                  </div>
                  {!seat && <div className="text-[10px] text-slate-500 italic">waiting...</div>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
