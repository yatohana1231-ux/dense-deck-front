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
- PUT `/api/user/password`
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
- GET `/api/history?limit=&page=&excludePreflopFolds=`
- POST `/api/history`

## Settings
- GET `/api/settings`
- PUT `/api/settings`

## Gallery
- GET `/api/gallery/tags`
  - res: `{ authorFixedTags: [{ key, label }], viewerTags: [{ key, label }], focusPoints: [{ key, label }], lang }`
- POST `/api/gallery/posts`
  - req: `{ handId, title?, privateNote?, fixedTagKeys?, freeTags?, focusPoint? }`
  - res: `{ postId }`
- GET `/api/gallery/posts?tag=&page=&limit=`
  - res: `{ items: [...] }` (各itemに`handReplay`を含む)
- GET `/api/gallery/posts/by-hand/:handId`
  - res: `{ postId }`
- GET `/api/gallery/posts/:postId`
  - res: `{ postId, title, authorTags, viewerTags, focusPoint, handReplay, createdAt, isOwner, status?, privateNote?, metrics? }`
- PATCH `/api/gallery/posts/:postId`
  - req: `{ title?, privateNote?, fixedTagKeys?, freeTags?, focusPoint? }`
- POST `/api/gallery/posts/:postId/withdraw`
- POST `/api/gallery/posts/:postId/like`
- DELETE `/api/gallery/posts/:postId/like`
- PUT `/api/gallery/posts/:postId/viewer-tags`
  - req: `{ tagKeys: string[] }`
- POST `/api/gallery/posts/:postId/view/start`
  - req: `{ viewerAnonId? }`
  - res: `{ viewSessionId }`
- POST `/api/gallery/posts/:postId/view/end`
  - req: `{ viewSessionId, dwellMs }`

## WebSocket
- WS `/ws/rooms`
  - res: `{ type: "rooms", rooms: [...] }`
- WS `/ws/rooms/:id`
  - res: `{ type: "room", room: ... }`
  - res: `{ type: "game", state: ... }` (stateは`actionDeadline`を含む)
  - res: `{ type: "gameClear" }`
  - res: `{ type: "roomClosed", message: ... }`
  - res: `{ type: "error", message: ... }`
