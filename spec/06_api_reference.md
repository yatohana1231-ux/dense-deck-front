# 06 API Reference

## Health
- GET `/api/health` -> `{ ok: true, service: "dense-deck-api" }`
- GET `/health` -> 同上

## Auth
- POST `/api/auth/guest`
- GET `/api/auth/me`
- POST `/api/auth/register`
- POST `/api/auth/login`
- POST `/api/auth/logout`
- POST `/api/user/username`
- POST `/api/password/reset/request`
- POST `/api/password/reset/confirm`

## Rooms
- GET `/api/rooms`
- POST `/api/rooms`
- POST `/api/rooms/:id/join`
- POST `/api/rooms/:id/leave`
- POST `/api/rooms/:id/start`
- POST `/api/rooms/:id/action`
- POST `/api/rooms/:id/rebuy`
- POST `/api/rooms/:id/heartbeat`

## Deal
- POST `/api/deal`
  - req: `{ seatCount, playerOrder, mode }`
  - res: `{ handId, mode, seatCount, playerOrder, hands, boardReserved }`

## History
- GET `/api/history?limit=&page=`
- POST `/api/history`

## WebSocket
- WS `/ws/rooms`
  - res: `{ type: "rooms", rooms: [...] }`
- WS `/ws/rooms/:id`
  - res: `{ type: "room", room: ... }`
  - res: `{ type: "game", state: ... }`
  - res: `{ type: "gameClear" }`
  - res: `{ type: "roomClosed", message: ... }`
  - res: `{ type: "error", message: ... }`
