# 06 Hand Gallery

## 目的
- Hand History から公開価値のあるハンドを投稿・共有する
- 投稿ハンドに対してタグ付け・いいね・閲覧計測を行う

## 画面導線
- Hand History 上部タブ
  - `History`（個人履歴）
  - `Gallery`（投稿一覧）
  - `Museum`（将来拡張、現時点は無効）

## 一覧表示（Gallery）
- History と同系統のカード表示
- ハンド/ボード/勝敗を表示
- 投稿タグ（固定タグ/フリータグ/Focus）を表示

## 詳細表示（Gallery Detail）
- 投稿ハンドのリプレイを表示
- 投稿者のみ編集・withdraw可能
- いいね、Viewerタグ付け可能

## ハンド公開ルール
- 投稿者ハンドは表示
- 対戦相手ハンドは実戦時の公開結果に従う
  - `showedHoleCards=false` は非表示
- `allin_runout` 由来の手は、保存された公開結果に従って表示

## タグ仕様
### Author Fixed Tags
- 複数選択可（上限5）
- 主なキー例
  - `range-spot`, `theory-check`, `exploit-spot`, `balance-spot`, `close-spot`
  - `counterintuitive`, `thin-value`, `bluff-catcher`, `discussion-worthy`, `interesting-spot`, `educational`

### Author Free Tags
- 0-2件
- 正規化キー `tag_norm` で保存

### Viewer Tags
- 閲覧者が付与
- 複数指定を保持（投稿×ユーザー×タグで一意）

### Focus Point
- `Preflop | Flop | Turn | River`

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

## データモデル
- `hand_archive_posts`
- `hand_archive_post_fixed_tags`
- `hand_archive_post_free_tags`
- `hand_archive_likes`
- `hand_archive_viewer_tags`
- `hand_archive_view_uniques`（`viewer_key`）
- `hand_archive_view_sessions`（`viewer_key`, `dwell_ms`）
