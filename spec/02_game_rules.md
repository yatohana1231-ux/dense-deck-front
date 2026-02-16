# 02 Game Rules (実装準拠)

## デッキとボード予約
- 52枚デッキを使用
- `boardReserved` は10枚固定
- 0-2: flop, 3: turn, 4: river, 5-9: burn予備

## モード
- オンライン対戦は `superDense` 固定

## ポジションとブラインド
- 4max: BTN / BB / UTG / CO
- 3人時: BTN / UTG / BB
- 2人時: BTN / BB
- SBなし、シングルブラインド制（BBのみ）
- 1BB = 100 points

## アクション
- `fold / check / call / bet / raise`
- `amount` はストリート内の合計ベット額（total）
- 最小bet: 100 points
- 最小raise: `max(currentBet + lastRaise, currentBet + 100)`
- 最小raise未満のオールインは `raiseBlocked=true` で以降raise不可

## ストリート進行
- `Street`: `preflop | flop | turn | river | showdown | allin_runout`
- 1人残りは `autoWin` 決着
- アクション可能者が1人以下かつベット一致で進行終了判定
  - all-inあり かつ side potなし (`computePots(...).length===1`): `allin_runout`
  - それ以外: `showdown`

## オールイン自動進行 (`allin_runout`)
- 対象: side potなしのオールイン決着
- 残りボードを `revealStreet` で段階公開
- 段階公開後、ショーダウン段階へ進行

## ショーダウン進行段階（API主導）
- `showdownStage`: `none | reveal | result | settled`
- 進行順序
  1. reveal（ハンド公開）
  2. result（勝敗表示）
  3. settled（精算済み）
- `settleHand` 実行時に `handEnded=true` と `showdownStage="settled"` を同時配信

## Muck
- 通常showdown: `auto_muck_when_losing=true` の敗者は非公開可
- `allin_runout`: Muck設定に関わらずポット参加者を公開
- 履歴保存時は `showed_hole_cards` に反映

## タイマー
- アクション制限: `actionSeconds`（デフォルト60秒）
- 切断猶予: `reconnectGraceSeconds`（デフォルト60秒）
- アクション期限超過: check可能ならcheck、不可ならfold
- フロント残り時間は `actionDeadline` 基準

## ハンド終了
- 精算後に履歴保存
- ルーム状態は `WAITING` へ遷移
- `pendingLeaveUserIds` はハンド終了後に確定処理
