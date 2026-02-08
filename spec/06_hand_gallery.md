# Hand Gallery 仕様

## 目的
- プレイヤーが自分のハンドを投稿し、他ユーザーが閲覧できる共有機能を提供する
- ハンド履歴（History）とは別に、公開・整理されたハンドの閲覧体験を用意する

## 画面構成
### Hand History 画面
- 上部にタブを表示
  - `History`（デフォルト）
  - `Gallery`
  - `Museum`（将来拡張、グレーアウトで選択不可）
- `Gallery` タブ
  - Gallery の一覧を表示
  - カード下部にタグを表示
  - 表示内容は History と同じ形式（ハンドID、ボード、勝敗、BTN、Pot、Winners）

### Gallery 一覧画面（単体）
- `Hand Gallery` の一覧を表示
- History と同様のハンド表示
- 投稿に紐づくタグ・Focus をカード下部に表示
- フィルタ: Author 固定タグ（Fixed Tags）で絞り込み可能
- ページング: 1ページ20件

### Gallery 詳細画面
- 投稿されたハンドのリプレイ閲覧ができる
- 投稿者のみ編集/削除（withdraw）可能
- いいね、閲覧タグの付与が可能

## 権限・ユーザー制限
- 投稿/編集/削除はログイン済みの登録ユーザーのみ可能
- ゲストは閲覧のみ

## ハンド情報の表示ルール
- Gallery の表示は「実戦中の公開状況」を反映
  - `showedHoleCards = false` のプレイヤーはハンドを表示しない
  - **投稿者のみ、常に自分のハンドを表示する**
    - 閲覧者が誰であっても、投稿者のハンドは表示される

## タグ仕様
### Author 固定タグ（Fixed Tags）
- 投稿者が選択可能（最大5個）
- 許可リスト:
  - `range-spot`
  - `theory-check`
  - `exploit-spot`
  - `balance-spot`
  - `close-spot`
  - `counterintuitive`
  - `thin-value`
  - `bluff-catcher`
  - `discussion-worthy`
  - `interesting-spot`
  - `educational`

### Author フリータグ（Free Tags）
- 投稿者が入力可能（最大2個）
- 英数字/`_`/`-` のみ、1〜20文字
- 正規化: 連続スペースは1つに、trim、小文字化

### Viewer タグ
- 閲覧者が付与可能（最大3個）
- 許可リスト:
  - `thought-provoking`
  - `surprising`
  - `subtle`
  - `clean`
  - `learned-something`
  - `new-perspective`
  - `want-to-try`
  - `tragic`
  - `comic`
  - `rollercoaster`

### Focus Point
- 1つ選択可能（任意）
- `Preflop` / `Flop` / `Turn` / `River`

## API 仕様（抜粋）
### タグ取得
- `GET /api/gallery/tags`
- レスポンス: `authorFixedTags`, `viewerTags`, `focusPoints`

### 投稿作成
- `POST /api/gallery/posts`
- 必須: `handId`
- 任意: `title`, `privateNote`, `fixedTagKeys`, `freeTags`, `focusPoint`

### 投稿一覧
- `GET /api/gallery/posts?tag=<fixedTagKey>&page=<n>&limit=<n>`
- `items[]` に `handReplay` を含む
- `handReplay` はマスク済み

### 投稿詳細
- `GET /api/gallery/posts/:postId`
- `handReplay` を含む

### 投稿更新
- `PATCH /api/gallery/posts/:postId`
- 投稿者のみ

### 投稿削除（Withdraw）
- `POST /api/gallery/posts/:postId/withdraw`
- 投稿者のみ

### いいね
- `POST /api/gallery/posts/:postId/like`
- `DELETE /api/gallery/posts/:postId/like`

### Viewer タグ
- `PUT /api/gallery/posts/:postId/viewer-tags`

### 閲覧計測
- `POST /api/gallery/posts/:postId/view/start`
- `POST /api/gallery/posts/:postId/view/end`

## データモデル（抜粋）
### `hand_archive_posts`
- `post_id` (PK)
- `hand_id` (unique)
- `author_user_id`
- `title`, `private_note`, `status`, `focus_point`
- 集計: `views_total`, `views_unique`, `dwell_ms_total`, `dwell_ms_avg`

### `hand_archive_post_fixed_tags`
- `post_id`, `tag_key`

### `hand_archive_post_free_tags`
- `post_id`, `tag_text`, `tag_norm`

### `hand_archive_likes`
- `post_id`, `user_id`

### `hand_archive_viewer_tags`
- `post_id`, `user_id`, `tag_key`

### `hand_archive_view_uniques`
- `post_id`, `viewer_anon_id`

### `hand_archive_view_sessions`
- `post_id`, `viewer_anon_id`, `started_at`, `ended_at`, `dwell_ms`

## 備考
- Museum は将来機能。現在は UI で選択不可。
- Gallery の一覧/詳細に表示するハンド情報は、History と同じ構成で表示する。
