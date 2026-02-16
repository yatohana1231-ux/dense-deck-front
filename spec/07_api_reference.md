# 07 API Reference

## Health
- GET `/api/health`
- GET `/health`

## Auth
- POST `/api/auth/guest`
- GET `/api/auth/me`
- POST `/api/auth/register`
- POST `/api/auth/login`
- POST `/api/auth/logout`
- POST `/api/user/username`
- PUT `/api/user/password`
- POST `/api/password/reset/request`
- POST `/api/password/reset/confirm`

## Rooms
- GET `/api/rooms`
- POST `/api/rooms`
  - req: `{ name?, password?, tag?, config?: { initialStackPoints?, actionSeconds?, reconnectGraceSeconds?, rebuyPoints? } }`
  - res: `{ room }`
- POST `/api/rooms/:id/join`
  - req: `{ password? }`
  - res: `{ room }`
- POST `/api/rooms/:id/leave`
  - res: `{ ok: true, reserved: boolean }`
- POST `/api/rooms/:id/start`
  - res: `{ room }`
- POST `/api/rooms/:id/action`
  - req: `{ playerIndex, kind, amount? }`
  - res: `{ state }`
- POST `/api/rooms/:id/rebuy`
  - req: `{ amount }`
  - res: `{ room }`
- POST `/api/rooms/:id/heartbeat`
  - res: `{ ok: true }`

## Deal
- POST `/api/deal`
  - req: `{ seatCount, playerOrder, mode }`
  - res: `{ handId, mode, seatCount, playerOrder, hands, boardReserved }`

## History
- GET `/api/history?limit=&page=&excludePreflopFolds=`
- POST `/api/history`

## Settings
- GET `/api/settings`
- PUT `/api/settings`

## Gallery
- GET `/api/gallery/tags`
- POST `/api/gallery/posts`
- GET `/api/gallery/posts?tag=&page=&limit=`
- GET `/api/gallery/posts/by-hand/:handId`
- GET `/api/gallery/posts/:postId`
- PATCH `/api/gallery/posts/:postId`
- POST `/api/gallery/posts/:postId/withdraw`
- POST `/api/gallery/posts/:postId/like`
- DELETE `/api/gallery/posts/:postId/like`
- PUT `/api/gallery/posts/:postId/viewer-tags`
- POST `/api/gallery/posts/:postId/view/start`
- POST `/api/gallery/posts/:postId/view/end`

## WebSocket
- WS `/ws/rooms`
  - `{ type: "rooms", rooms: [...] }`
- WS `/ws/rooms/:id`
  - `{ type: "room", room }`
  - `{ type: "game", state }`
  - `{ type: "gameClear" }`
  - `{ type: "roomClosed", message }`
  - `{ type: "error", message }`

## game state（主要）
- `table`
  - `street`: `preflop|flop|turn|river|showdown|allin_runout`
  - `revealStreet`
  - `currentPlayer`, `actionLog`, `pots`, `autoWin`, `handId`
- `actionDeadline`
- `handEnded`
- `handSettled`
- `runoutDelayMs`
- `showdownStage`: `none|reveal|result|settled`
