# 02 Game Rules (実装準拠)

## デッキとボード予約 (boardReserved)
- 52枚の標準デッキを使用
- `boardReserved` は10枚固定
  - 0-2: Flop
  - 3: Turn
  - 4: River
  - 5-9: Burn予備

## スターティングハンドの配布
- 事前に `boardReserved` を確定
- 重み付きハンドクラス抽選
  - 重み = weightDense.json の値
  - classKeyのcombo数を掛けた実効重みで抽選
- 既使用カードと重複する場合は再抽選
- 最大128回リトライ、失敗時は例外または空結果

## モード
- `superDense` / `dense`
- オンライン手札生成は `superDense` 固定

## ポジションとアクション順
- 4max固定: BTN / BB / UTG / CO
- Preflop: UTG -> CO -> BTN -> BB
- Postflop: BB -> UTG -> CO -> BTN

## ブラインド
- BBのみ強制ベット (1BB)
- SBは存在しない

## アクション
- 可能アクション: fold / check / call / bet / raise
- `amount` は「ストリート内の合計ベット額」
- bet最小値: 1BB
- raise最小値: 直前のレイズ幅 (lastRaise)
- 最小レイズ未満のオールインは raise成立せず、以後 raise不可

## ストリート進行
- 全員のベット額が揃い、最後のアグレッサが一巡すると次ストリート
- アクション可能者が1人以下でベット額一致なら即ショーダウン
- 1人だけ残った場合 `autoWin` で即決

## オールイン処理
- all-inはstackが0になった時点で判定
- `raiseBlocked` により以後レイズ禁止
- all-in発生時は通常と同じくショーダウンへ進行

## タイマーと自動アクション
- `actionSeconds` (デフォルト60秒)
- `reconnectGraceSeconds` (デフォルト60秒)
- タイムアウト時は check可能ならcheck、不可ならfold

## ショーダウン
- showdownで役を比較し勝者決定
- side potを含む配分を計算
- 配分後はstack更新、0以下は sit out

## ハンド終了
- ハンド終了時に履歴をDB保存
- ルーム状態はWAITINGへ戻る
- pendingLeaveはHAND_ENDで確定
