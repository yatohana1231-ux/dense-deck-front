export type RoomSummary = {
  id: string;
  name: string;
  state: string;
  tag: string;
  hasPassword: boolean;
  seats: any[];
  maxSeats: number;
  config: {
    initialStackPoints: number;
    actionSeconds: number;
    reconnectGraceSeconds: number;
    rebuyPoints: number;
  };
  createdAt: number;
  btnIndex?: number;
};

export type InHandState = any; // server TableState shape

export type WsMessage =
  | { type: "rooms"; rooms: RoomSummary[] }
  | { type: "room"; room: RoomSummary }
  | { type: "game"; state: InHandState }
  | { type: "gameClear" }
  | { type: "roomClosed"; message: string }
  | { type: "error"; message: string };

export function connectRoomListWs(apiBase: string, onMessage: (msg: WsMessage) => void) {
  const ws = new WebSocket(`${apiBase.replace(/^http/, "ws")}/ws/rooms`);
  ws.onmessage = (ev) => {
    try {
      const data = JSON.parse(ev.data);
      onMessage(data);
    } catch (e) {
      console.error(e);
    }
  };
  return ws;
}

export function connectRoomWs(apiBase: string, roomId: string, onMessage: (msg: WsMessage) => void) {
  const ws = new WebSocket(`${apiBase.replace(/^http/, "ws")}/ws/rooms/${roomId}`);
  ws.onmessage = (ev) => {
    try {
      const data = JSON.parse(ev.data);
      onMessage(data);
    } catch (e) {
      console.error(e);
    }
  };
  return ws;
}
