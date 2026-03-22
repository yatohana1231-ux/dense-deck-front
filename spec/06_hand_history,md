# 06 Hand History

## 目的
- `hand_records` と `hand_participants` を元データとして、自分のハンド履歴を一覧表示する
- 一覧から Replay や Gallery 投稿へ遷移できるようにする

## 元データ
- 親データ: `hand_records`
- 子データ: `hand_participants`
- 取得対象はログインユーザーが参加したハンドのみ

## 取得 API
- `GET /api/history?limit=&page=&excludePreflopFolds=`
- 認証必須
- `limit` の最大値は 100
- `page` によるページングに対応
- `excludePreflopFolds=true` の場合、自分が preflop fold したハンドを除外する

## API 側の取得処理
1. セッションからログインユーザーを特定する
2. `hand_participants` に対象ユーザーが含まれる `hand_records` を抽出する
3. `played_at desc`, `hand_id desc` で新しい順に並べる
4. 各 `hand_record` に紐づく `hand_participants` を user 情報付きで取得する
5. Hand History 画面用の JSON を返す

## フロント側の変換処理
1. `GET /api/history` のレスポンスを受け取る
2. 各レコードを `HandRecord` 形式へ変換する
3. `boardCards` を `flop / turn / river` に分解する
4. `participants[].seat` をもとに seat 順の `holeCards` 配列を再構成する
5. `participants[].userId` とログインユーザー ID を照合して hero seat を決定する
6. `result.winners`, `result.handValues`, `result.pot`, `result.streetEnded` を表示用に引き継ぐ
7. 変換後データを `history` 配列として画面に保持する

## 画面生成の概要
- Hand History 画面は `HistoryView` で描画する
- `history` 配列を順に `HandCard` へ渡して一覧表示する
- 各カードでは主に以下を表示する
  - `handId`
  - `buttonSeat`
  - `pot`
  - `winners`
  - hero の hole cards
  - board cards
- ハンドがない場合は空表示メッセージを出す

## 画面上の導線
- カード選択で Replay を起動する
- ログイン時はカードから Gallery 投稿導線を表示できる
- 上部タブから `History / Gallery / Museum` を切り替える

## 利用する主な項目
- `hand_records`
  - `hand_id`
  - `played_at`
  - `hand_started_at`
  - `button_seat`
  - `board_cards_json`
  - `actions_json`
  - `result_json`
  - `initial_stacks_json`
  - `final_stacks_json`
- `hand_participants`
  - `user_id`
  - `seat`
  - `username`
  - `hole_cards_json`
  - `showed_hole_cards`
  - `folded_street`

## 備考
- Hand History 一覧は `hand_records` と `hand_participants` を画面用に再構成した結果を表示している
- Gallery 一覧も同系統のカード UI を使うが、取得元 API と追加情報は別
