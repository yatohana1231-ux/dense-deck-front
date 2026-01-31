# 03 Online Rooms

## ルームの状態
- WAITING: 着席中/ハンド未開始
- STARTING: ハンド開始準備
- IN_HAND: ハンド進行中
- CLOSED: ルーム終了

## ルーム一覧
- `GET /api/rooms`
- seatsが0のルームは一覧に出ない

## ルーム作成
- `POST /api/rooms`
- name/password/tag/configを受け付け
- tagは未指定時「未設定」
- 作成者は自動で着席

## 参加/退出
- `POST /api/rooms/:id/join` (WAITINGのみ)
- `POST /api/rooms/:id/leave`
- IN_HAND中のleaveはpendingLeaveに登録しHAND_ENDで確定

## 開始
- `POST /api/rooms/:id/start`
- WAITINGかつアクティブ席>=2で開始
- 開始後はIN_HANDに遷移してhandを開始

## 自動開始 (フロント実装)
- RoomGame画面でアクティブ席が2以上かつ手がなければ自動でstartリクエスト

## ルーム設定
- `initialStackBB`: 100
- `actionSeconds`: 60
- `reconnectGraceSeconds`: 60
- `rebuyAmount`: 200
- `maxSeats`: 4

## 座席データ（設定反映）
- 入室時に `autoMuckWhenLosing` を座席データとして保持し、ショーダウン表示に反映

## Rebuy
- `POST /api/rooms/:id/rebuy` (amount指定)
- UIは `initialStackBB` をデフォルト表示して送信

## ルーム維持と自動終了
- lastActive更新はjoin/leave/heartbeat/actionなど
- 1時間以上アクティブでない場合は自動close

## WebSocket
- `/ws/rooms`: rooms一覧のpush
- `/ws/rooms/:id`: 個別ルーム + game state
- IN_HAND中は着席者のみ接続可

## WSメッセージ
- type: `rooms`, `room`, `game`, `gameClear`, `roomClosed`, `error`
