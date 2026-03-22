# encode
utf-8

# 概要
ハンド履歴保存 API と対戦終了時の保存処理で、1 ハンド分の結果を `hand_records` と `hand_participants` に保存する。

# 保存項目一覧
Hand History 保存 API `POST /api/history` と対戦終了時の内部保存処理では、以下の項目を保存する。

## hand_records に保存する項目

- `hand_id`
  - UUID
  - サーバ側で採番
- `room_id`
  - ルーム ID
  - 任意
- `match_id`
  - マッチ ID
  - 任意
- `hand_no_in_match`
  - マッチ内のハンド番号
  - `matchId` があり未指定の場合はサーバ側で自動採番
- `played_at`
  - 保存日時
  - サーバ時刻で設定
- `hand_started_at`
  - ハンド開始日時
  - リクエストの `handStartedAt`
- `mode`
  - ゲームモード
- `max_players`
  - 最大参加人数
- `button_seat`
  - ボタン seat
- `sb_seat`
  - SB seat
- `bb_seat`
  - BB seat
  - 任意
- `stakes_json`
  - ブラインドやポイント単位などの設定
  - 保存元: `stakes`
- `initial_stacks_json`
  - ハンド開始時スタック配列
  - 保存元: `initialStacks`
- `final_stacks_json`
  - ハンド終了時スタック配列
  - 保存元: `finalStacks`
  - 任意
- `board_cards_json`
  - ボードカード配列
  - 保存元: `boardCards`
- `actions_json`
  - アクション履歴
  - 保存元: `actions`
- `result_json`
  - ハンド結果情報
  - 保存元: `result`
  - 想定内容: `winners`, `handValues`, `pot`, `pots`, `autoWin`, `streetEnded` など
- `room_snapshot_json`
  - ルーム設定スナップショット
  - 保存元: `roomSnapshot`
- `integrity_hash`
  - 現状は `null`

## hand_participants に保存する項目

- `hand_participant_id`
  - UUID
  - サーバ側で採番
- `hand_id`
  - 親の hand record を参照
- `user_id`
  - ユーザー ID
  - 任意
- `seat`
  - 参加 seat
- `role`
  - 参加者のポジション
  - 保存値は `BTN / BB / UTG / CO / UNKNOWN`
- `joined_at_hand_start`
  - 開始時に参加していたか
- `left_before_hand_end`
  - 終了前に離脱したか
- `hole_cards_json`
  - ホールカード
  - 任意
- `showed_hole_cards`
  - ホールカードを公開したか
- `folded_street`
  - フォールドしたストリート
  - 任意
- `net_result_points`
  - そのハンドでの増減ポイント
  - 任意
- `starting_stack_points`
  - ハンド開始時スタック
  - 任意
- `ending_stack_points`
  - ハンド終了時スタック
  - 任意
- `is_winner`
  - 勝者かどうか

## API で必須の主な入力項目
- `mode`
- `maxPlayers`
- `buttonSeat`
- `sbSeat`
- `stakes`
- `initialStacks`
- `boardCards`
- `actions`
- `result`
- `roomSnapshot`
- `participants`

## API で任意の入力項目
- `roomId`
- `matchId`
- `handNoInMatch`
- `handStartedAt`
- `bbSeat`
- `finalStacks`
