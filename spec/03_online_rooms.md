# 03 Online Rooms

## ルーム状態
- `WAITING`: ハンド未進行
- `STARTING`: 開始遷移中
- `IN_HAND`: ハンド進行中
- `CLOSED`: ルーム終了

## ルーム設定（現行）
- `initialStackPoints`: 10000
- `actionSeconds`: 60
- `reconnectGraceSeconds`: 60
- `rebuyPoints`: 20000
- `maxSeats`: 4

## ルーム作成
- `POST /api/rooms`
- 入力: `name`, `password`, `tag`, `config`
- 作成者は自動着席
- `match_sessions` を同時生成

## 参加/退出
- `POST /api/rooms/:id/join`
  - `WAITING` のみ参加可
- `POST /api/rooms/:id/leave`
  - 退出可能タイミングなら即退出: `{ ok: true, reserved: false }`
  - 退出不可タイミングなら予約: `{ ok: true, reserved: true }`
- 退出予約は `pendingLeaveUserIds` で管理

## 開始
- `POST /api/rooms/:id/start`
- 条件: `WAITING` かつアクティブ席2以上
- 実行で `IN_HAND` に遷移し `startHand`

## Rebuy
- `POST /api/rooms/:id/rebuy`
- req: `{ amount }`（points）

## 座席データ
- `autoMuckWhenLosing` を座席に保持
- ショーダウン表示時の公開制御に使用

## 自動開始（フロント）
- RoomGameでアクティブ席2以上かつハンド非進行時に `start` を自動送信
- 次ハンドは `handEnded=true` かつ `showdownStage="settled"` 到達後に開始

## WebSocket
- `/ws/rooms`: ルーム一覧push
- `/ws/rooms/:id`: ルーム + ゲーム状態push
- `IN_HAND` 中は着席者以外の接続を拒否
- メッセージ: `rooms`, `room`, `game`, `gameClear`, `roomClosed`, `error`
