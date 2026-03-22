# 05 Hand Records

## 目的
- 対戦で確定した 1 ハンド分の結果を DB に永続化する
- Hand History、Replay、Hand Gallery の元データを保持する

## 保存タイミング
- ハンド精算完了後に保存する
- 保存処理は API サーバ側で実行する
- 保存先は `hand_records` と `hand_participants`

## 保存単位
- 1 ハンドにつき `hand_records` に 1 レコード作成する
- 同じハンドの参加者数分だけ `hand_participants` にレコード作成する
- 親子関係は `hand_records.hand_id` と `hand_participants.hand_id`

## 保存処理の概要
1. ハンド終了時点のテーブル状態から勝者、役、ポット情報を確定する
2. 開始時スタックと終了時スタックから各参加者の増減ポイントを計算する
3. Muck 設定や showdown 状態をもとに、各参加者のホールカード公開可否を決定する
4. 各参加者の `seat` と `buttonSeat` からポジションを計算する
5. `hand_records` にハンド全体の情報を保存する
6. `hand_participants` に参加者ごとの情報をまとめて保存する

## hand_records に保存する主な内容
- ハンド識別子
  - `hand_id`
- 対戦の所属情報
  - `room_id`
  - `match_id`
  - `hand_no_in_match`
- 時刻情報
  - `played_at`
  - `hand_started_at`
- 卓情報
  - `mode`
  - `max_players`
  - `button_seat`
  - `sb_seat`
  - `bb_seat`
- ルール・スタック情報
  - `stakes_json`
  - `initial_stacks_json`
  - `final_stacks_json`
- ハンド進行情報
  - `board_cards_json`
  - `actions_json`
- 結果情報
  - `result_json`
  - 主な内訳は `winners`, `handValues`, `pot`, `pots`, `autoWin`, `streetEnded`
- ルーム設定スナップショット
  - `room_snapshot_json`

## hand_participants に保存する主な内容
- 参加者識別情報
  - `user_id`
  - `seat`
  - `role`
- 参加状態
  - `joined_at_hand_start`
  - `left_before_hand_end`
- カード公開情報
  - `hole_cards_json`
  - `showed_hole_cards`
  - `folded_street`
- 結果情報
  - `net_result_points`
  - `starting_stack_points`
  - `ending_stack_points`
  - `is_winner`

## role の保存内容
- `hand_participants.role` には参加者のポジションを保存する
- 保存値は `BTN / BB / UTG / CO / UNKNOWN`
- 既存の保存済みデータに `"player"` が残っている場合は、表示時に `UNKNOWN` として扱う

## showedHoleCards
- 実際に公開されたホールカードかどうかを保存する
- 通常 showdown では、敗者が Muck 設定なら `false` になり得る
- `allin_runout` では、ポット参加者は公開対象として `true` になる

## match 内ハンド番号
- `match_id` がある場合は `hand_no_in_match` を採番する
- 採番は `match_sessions.next_hand_no` を進めて行う

## 保存後の利用先
- Hand History 一覧の元データ
- Replay 画面の元データ
- Hand Gallery 投稿可否判定と投稿元データ
