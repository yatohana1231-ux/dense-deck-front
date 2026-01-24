# 05 Hand History

## 保存タイミング
- ハンド終了時にAPIがDBへ保存
- `hand_records` / `hand_participants` に記録

## 履歴取得
- `GET /api/history?limit=10&page=1`
- 認証必須
- 自分が参加したハンドのみ
- `limit` 最大100

## 履歴保存 (API)
- `POST /api/history`
- 認証必須
- simulator等での手動保存向け

## 主要フィールド (APIレスポンス)
- handId, roomId, matchId, handNoInMatch
- playedAt, handStartedAt
- mode, maxPlayers, buttonSeat, sbSeat, bbSeat
- stakes, initialStacks, finalStacks
- boardCards, actions, result, roomSnapshot
- participants[]: seat, userId, username, holeCards, foldedStreet, netResultBB など

## フロントのハンド変換
- `boardCards` を flop/turn/riverに分解
- `participants` から seat別のholeCards/usernameを再構成
- `result` から winners/handValues を採用
