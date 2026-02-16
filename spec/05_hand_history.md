# 05 Hand History

## 保存タイミング
- ハンド精算完了後に保存
- 保存先: `hand_records` / `hand_participants`

## 履歴取得
- `GET /api/history?limit=&page=&excludePreflopFolds=`
- 認証必須
- 自分参加ハンドのみ
- `limit` 最大100

## 手動保存
- `POST /api/history`
- 認証必須（主に検証用途）

## 主なレスポンス項目
- `handId, roomId, matchId, handNoInMatch`
- `playedAt, handStartedAt`
- `mode, maxPlayers, buttonSeat, sbSeat, bbSeat`
- `stakes, initialStacks, finalStacks`
- `boardCards, actions, result, roomSnapshot`
- `participants[]`
  - `seat, userId, username`
  - `holeCards, showedHoleCards, foldedStreet`
  - `netResultPoints, startingStackPoints, endingStackPoints, isWinner`

## showedHoleCards
- 実際に公開されたかを記録
- 通常showdownでは Muck設定に応じて `false` になり得る
- `allin_runout` ではポット参加者は公開（`true`）

## result_json
- `winners, handValues, pot, pots, autoWin, streetEnded` を保持
- `streetEnded` は `showdown` または `allin_runout` を取り得る

## フロント変換
- `boardCards` から flop/turn/river を再構成
- `participants` から seat別ハンド/表示名を再構成
- `result` から winners/handValues を再構成
