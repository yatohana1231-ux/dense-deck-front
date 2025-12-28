import { useEffect, useState } from "react";
import { connectRoomWs, type RoomSummary, type InHandState, type WsMessage } from "../api/ws.js";

type RoomState = {
  room: RoomSummary | null;
  game: InHandState | null;
  error: string | null;
};

export function useRoomState(apiBase: string, roomId: string) {
  const [state, setState] = useState<RoomState>({ room: null, game: null, error: null });

  useEffect(() => {
    const ws = connectRoomWs(apiBase, roomId, (msg: WsMessage) => {
      if (msg.type === "room") setState((prev) => ({ ...prev, room: msg.room }));
      if (msg.type === "game") setState((prev) => ({ ...prev, game: msg.state as any }));
      if (msg.type === "gameClear") setState((prev) => ({ ...prev, game: null }));
      if (msg.type === "error") setState((prev) => ({ ...prev, error: msg.message }));
    });
    return () => ws.close();
  }, [apiBase, roomId]);

  return state;
}

