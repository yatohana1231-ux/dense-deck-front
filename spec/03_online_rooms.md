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

## 対戦相手スタッツ表示（フロント）
- 対象画面: Online Table（RoomGame）
- PCのみ実装（SPのタップUIは未実装）
- 自席・相手席ともに、席ホバー時に表示
- 席エリア（ユーザー名・カード周辺）ホバー中は、ツールチップをポインタ追従で表示
- ツールチップは不透明背景で表示

### 保存先（localStorage）
- キー: `dense-deck-opponent-stats`
- 値: `Record<userId, { hands, actions, voluntarilyPut, showdown, check, bet, raise, call, fold }>`
- ルーム入場時に同席ユーザーで同期:
  - 未登録ユーザーは0初期化
  - 退出ユーザーは削除
- 退場時は `dense-deck-opponent-stats` を削除（持ち越しなし）
- 同席者退出の反映は、各クライアントが `room.seats` 更新をトリガーに自端末データを同期削除

### 集計タイミングと定義
- 集計タイミング: `handEnded=true` のハンド終了時に1回だけ更新
- `hands`: 着席状態で配られたハンド数
- `actions`: そのハンド中に実行した action 数
- `voluntarilyPut`: そのハンド中に `call` / `bet` / `raise` が1回以上あれば +1（複数回でも1）
  - BB強制オールイン相当（開始スタック `<=100` のBB）は +1
- `showdown`: ハンド終了ストリートが `showdown` または `allin_runout` かつ、終了時に `fold=false` なら +1
- `check`: そのハンド中に `check` を選択した回数
- `bet`: そのハンド中に `bet` を選択した回数
- `raise`: そのハンド中に `raise` を選択した回数
- `call`: そのハンド中に `call` を選択した回数
- `fold`: そのハンド中に `fold` を選択した回数

### 表示フォーマット
- `Hands`: `hands`
- `VPIP`: `voluntarilyPut / hands`
- `AGG Acts`: `(bet + raise) / (check + call + bet + raise)`
- `PAS Acts`: `(check + call) / (check + call + bet + raise)`
- 表示FMT: `分子 / 分母（●%）`
- `%` は小数点第一位を四捨五入した整数表示
- 分母 `0` は `0 / 0（-）`
