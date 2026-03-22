# 07 Hand Gallery

## 目的
- Hand History から公開価値のあるハンドを投稿・共有する
- 投稿ハンドに対してタグ付け、いいね、閲覧計測を行う

## 画面導線
- Hand History 上部タブ
  - `History`（個人履歴）
  - `Gallery`（投稿一覧）
  - `Museum`（将来拡張、現時点は無効）

## 一覧表示（Gallery）
- History と同系統のカード表示を使用する
- 各カードでは主に以下を表示する
  - 投稿者名
  - タイトル
  - 投稿日時
  - 結果サマリ `Win / Lose / Chop`
  - 増減ポイント
  - 投稿者ポジション
  - Hand
  - BoardCards
  - 投稿者タグ
  - 閲覧者タグ

## Gallery カードの基準プレイヤー
- Gallery 一覧では投稿者を基準プレイヤーとして扱う
- `hand_archive_posts.author_user_id` と `users.username` から投稿者情報を特定する
- hand replay 内の `participants` から投稿者の `role`、`netResultPoints`、`holeCards` を参照する

## 投稿ハンド公開ルール
- 投稿者ハンドは表示する
- 対戦相手ハンドは実戦時の公開結果に従う
  - `showedHoleCards=false` は非表示
- `allin_runout` 由来のハンドは、保存された公開結果に従って表示する

## 投稿日時
- 一覧カードで表示する日時は `createdAt` を使う
- `playedAt` は一覧カードの主表示には使わない

## 結果・ポイント表示
- 結果は `Win / Lose / Chop` のいずれかを表示する
- ポイントは符号付きで表示する
  - 例: `+100 points`, `-100 points`
- 単位表記は `points`

## ポジション表示
- 一覧カードのポジション表示は `participants.role` を利用する
- 表示値は `BTN / BB / UTG / CO / UNKNOWN`

## タグ表示
- 投稿者タグは `authorTags.fixed` と `authorTags.free` を併せて表示する
- 閲覧者タグは `viewerTags.public` を表示する
- タグ未設定時は `-` を表示する

## タイトル未設定時
- タイトル未設定時はタイトル欄を表示しない

## API
- `GET /api/gallery/tags`
- `POST /api/gallery/posts`
- `GET /api/gallery/posts`
- `GET /api/gallery/posts/by-hand/:handId`
- `GET /api/gallery/posts/:postId`
- `PATCH /api/gallery/posts/:postId`
- `POST /api/gallery/posts/:postId/withdraw`
- `POST /api/gallery/posts/:postId/like`
- `DELETE /api/gallery/posts/:postId/like`
- `PUT /api/gallery/posts/:postId/viewer-tags`
- `POST /api/gallery/posts/:postId/view/start`
- `POST /api/gallery/posts/:postId/view/end`

## Gallery 一覧 API の主な返却項目
- `postId`
- `handId`
- `authorUserId`
- `authorUsername`
- `title`
- `authorTags.fixed`
- `authorTags.free`
- `viewerTags.public`
- `focusPoint`
- `createdAt`
- `handReplay`

## データモデル
- `hand_archive_posts`
- `hand_archive_post_fixed_tags`
- `hand_archive_post_free_tags`
- `hand_archive_likes`
- `hand_archive_viewer_tags`
- `hand_archive_view_uniques`（`viewer_key`）
- `hand_archive_view_sessions`（`viewer_key`, `dwell_ms`）
