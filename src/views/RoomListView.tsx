import { useEffect, useState } from "react";
import type { RoomSummary, WsMessage } from "../api/ws";
import { connectRoomListWs } from "../api/ws";

type Props = {
  apiBase: string;
  onSelect: (roomId: string) => void;
  onBack: () => void;
};

export default function RoomListView({ apiBase, onSelect, onBack }: Props) {
  const [rooms, setRooms] = useState<RoomSummary[]>([]);

  useEffect(() => {
    const ws = connectRoomListWs(apiBase, (msg: WsMessage) => {
      if (msg.type === "rooms") setRooms(msg.rooms);
    });
    return () => ws.close();
  }, [apiBase]);

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
            {r.hasPassword && <span className="text-xs text-rose-400">PW</span>}
          </div>
        ))}
        {rooms.length === 0 && (
          <div className="px-4 py-6 text-center text-slate-400">No rooms</div>
        )}
      </div>
    </div>
  );
}
