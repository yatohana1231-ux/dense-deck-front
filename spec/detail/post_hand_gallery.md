# Hand Gallery 投稿処理

## 目的
- Hand History に保存されたハンドのうち、投稿者本人が参加したハンドを Hand Gallery に投稿する
- 投稿時にタイトル、プライベートメモ、固定タグ、フリータグ、Focus Point を付与する

## 対象画面
- Hand History 画面
- Gallery Create 画面
- Gallery Detail 画面

## 処理全体の流れ
1. ユーザーが Hand History 画面で対象ハンドの `Gallery` ボタンを押す
2. フロントが `GET /api/gallery/posts/by-hand/:handId` を呼び、既存投稿の有無を確認する
3. 既存投稿がある場合は Gallery Detail へ遷移する
4. 既存投稿がない場合は Gallery Create へ遷移する
5. Gallery Create 画面表示時に `GET /api/gallery/tags` を呼び、タグ候補を取得する
6. ユーザーが入力した内容をもとに `POST /api/gallery/posts` を呼ぶ
7. API は投稿者が対象ハンドの参加者かどうかを検証し、投稿データを保存する
8. レスポンスの `postId` を使って Gallery Detail 画面へ遷移する

## 画面遷移の概要

### 1. Hand History から投稿導線に入る
- 実装箇所
  - `src/App.tsx`
  - `handleGalleryFromHistory`
- 入力
  - `record.handId: string`
- 挙動
  - `getGalleryByHand(apiBase, record.handId)` を呼ぶ
  - 取得成功時は既存投稿ありとして `galleryDetail` へ遷移する
  - 404 時は未投稿として `galleryCreate` へ遷移する

### 2. Gallery Create 画面で入力する
- 実装箇所
  - `src/views/GalleryCreateView.tsx`
- 主な画面 state
  - `title: string`
  - `privateNote: string`
  - `fixedTagKeys: string[]`
  - `freeTags: string[]`
  - `focusPoint: string | null`
  - `saving: boolean`
  - `error: string | null`

### 3. 投稿成功後の遷移
- `POST /api/gallery/posts` のレスポンス `postId` を受け取る
- `onCreated(postId)` を呼ぶ
- 親側で `galleryPostId` をセットし、Gallery Detail 画面へ遷移する

## コールする API

### 1. 既存投稿確認

#### エンドポイント
- `GET /api/gallery/posts/by-hand/:handId`

#### 用途
- 同一 `handId` の投稿が既に存在するかを確認する

#### パスパラメータ
- `handId: string`

#### レスポンス型
```ts
type GetGalleryByHandResponse = {
  postId: string;
};
```

#### 失敗時
- `404 not found`
  - 未投稿として扱う

### 2. 投稿画面用タグ取得

#### エンドポイント
- `GET /api/gallery/tags`

#### レスポンス型
```ts
type GalleryTagOption = {
  key: string;
  label: string;
};

type GalleryTagsResponse = {
  authorFixedTags: GalleryTagOption[];
  viewerTags: GalleryTagOption[];
  focusPoints: GalleryTagOption[];
  lang?: string;
};
```

### 3. Hand Gallery 投稿作成

#### エンドポイント
- `POST /api/gallery/posts`

#### 認証
- セッション必須
- ゲストユーザー不可

#### リクエスト型
```ts
type CreateGalleryPostRequest = {
  handId: string;
  title?: string;
  privateNote?: string;
  fixedTagKeys?: string[];
  freeTags?: string[];
  focusPoint?: "Preflop" | "Flop" | "Turn" | "River" | null;
};
```

#### リクエスト例
```json
{
  "handId": "8f6d8a7e-1c2b-4f60-9d5d-123456789abc",
  "title": "River call was too thin?",
  "privateNote": "CO vs BTN single raised pot",
  "fixedTagKeys": ["thin-value", "discussion-worthy"],
  "freeTags": ["river", "hero-call"],
  "focusPoint": "River"
}
```

#### 成功レスポンス型
```ts
type CreateGalleryPostResponse = {
  postId: string;
};
```

#### バリデーション
- `handId` 必須
- `title.length <= 60`
- `privateNote.length <= 500`
- `fixedTagKeys.length <= 5`
- `freeTags.length <= 2`
- `fixedTagKeys` は allowlist のみ
- `freeTags` は正規化後重複不可
- `freeTags` は英数字、`_`、`-` のみ
- `focusPoint` は `Preflop | Flop | Turn | River | null`

#### 業務制約
- 投稿者は対象ハンドの参加者でなければならない
- 同一 `handId` に対する投稿は 1 件のみ

#### エラーレスポンス
```ts
type ValidationErrorResponse = {
  error: {
    code: "VALIDATION_ERROR";
    message: "invalid input";
    fields: Record<string, string>;
  };
};

type HandAlreadyPostedResponse = {
  error: {
    code: "HAND_ALREADY_POSTED";
    postId: string;
  };
};
```

## 投稿後に一覧・詳細で利用される情報

### Gallery 一覧 API の主な返却項目
```ts
type GalleryListItem = {
  postId: string;
  handId: string;
  authorUserId: string;
  authorUsername: string | null;
  title: string;
  authorTags: { fixed: string[]; free: string[] };
  viewerTags: { public: string[] };
  focusPoint: string | null;
  createdAt: string;
  handReplay?: any;
};
```

補足:
- `authorUserId` は `hand_archive_posts.author_user_id`
- `authorUsername` は `authorUserId` と `users.username` を紐付けて返す

### handReplay.participants に含まれる主な項目
```ts
type HandReplayParticipant = {
  handParticipantId: string;
  handId: string;
  userId: string | null;
  username: string | null;
  seat: number;
  role: "BTN" | "BB" | "UTG" | "CO" | "UNKNOWN";
  joinedAtHandStart: boolean;
  leftBeforeHandEnd: boolean;
  holeCards: unknown[] | null;
  showedHoleCards: boolean;
  foldedStreet: string | null;
  netResultPoints: number | null;
  startingStackPoints: number | null;
  endingStackPoints: number | null;
  isWinner: boolean;
};
```

## 投稿時の保存先データ

### hand_archive_posts
- `post_id: string`
- `hand_id: string`
- `author_user_id: string`
- `title: string | null`
- `private_note: string | null`
- `status: string`
- `focus_point: string | null`
- `created_at: timestamptz`
- `updated_at: timestamptz`

### hand_archive_post_fixed_tags
- `post_id: string`
- `tag_key: string`

### hand_archive_post_free_tags
- `post_id: string`
- `tag_text: string`
- `tag_norm: string`
