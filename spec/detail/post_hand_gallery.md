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

#### リクエスト例
```http
GET /api/gallery/posts/by-hand/8f6d8a7e-1c2b-4f60-9d5d-123456789abc
```

#### レスポンス型
```ts
type GetGalleryByHandResponse = {
  postId: string;
};
```

#### 成功レスポンス例
```json
{
  "postId": "4d8a3b77-6d76-4f4d-b98a-123456789abc"
}
```

#### 失敗時
- `404 not found`
  - 未投稿として扱う

## 2. 投稿画面用タグ取得

### エンドポイント
- `GET /api/gallery/tags`

### 用途
- 投稿画面で選択可能な固定タグ、Viewer タグ、Focus Point を取得する

### レスポンス型
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

### 成功レスポンス例
```json
{
  "authorFixedTags": [
    { "key": "range-spot", "label": "range-spot" },
    { "key": "theory-check", "label": "theory-check" }
  ],
  "viewerTags": [
    { "key": "thought-provoking", "label": "thought-provoking" }
  ],
  "focusPoints": [
    { "key": "Preflop", "label": "Preflop" },
    { "key": "Flop", "label": "Flop" },
    { "key": "Turn", "label": "Turn" },
    { "key": "River", "label": "River" }
  ],
  "lang": "ja"
}
```

## 3. Hand Gallery 投稿作成

### エンドポイント
- `POST /api/gallery/posts`

### 認証
- セッション必須
- ゲストユーザー不可

### 用途
- 対象ハンド 1 件に対して Gallery 投稿を 1 件作成する

### リクエストヘッダ
```http
Content-Type: application/json
```

### リクエスト型
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

### 各項目
- `handId: string`
  - 投稿対象ハンドの ID
  - 必須
- `title?: string`
  - 投稿タイトル
  - 最大 60 文字
- `privateNote?: string`
  - 投稿者のみ参照するメモ
  - 最大 500 文字
- `fixedTagKeys?: string[]`
  - 固定タグキー配列
  - 最大 5 件
  - 許可済みキーのみ指定可能
- `freeTags?: string[]`
  - 自由入力タグ
  - 最大 2 件
  - 各タグは 1 文字以上 20 文字以下
  - 使用可能文字は `A-Za-z0-9_-`
  - 正規化後の重複は不可
- `focusPoint?: "Preflop" | "Flop" | "Turn" | "River" | null`
  - 注目ストリート
  - 指定時は allowlist に含まれる必要がある

### リクエスト例
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

### 成功レスポンス型
```ts
type CreateGalleryPostResponse = {
  postId: string;
};
```

### 成功レスポンス例
```json
{
  "postId": "4d8a3b77-6d76-4f4d-b98a-123456789abc"
}
```

### バリデーション
- `handId` 必須
- `title.length <= 60`
- `privateNote.length <= 500`
- `fixedTagKeys.length <= 5`
- `freeTags.length <= 2`
- `fixedTagKeys` は allowlist のみ
- `freeTags` は正規化後重複不可
- `freeTags` は英数字、`_`、`-` のみ
- `focusPoint` は `Preflop | Flop | Turn | River | null`

### 業務制約
- 投稿者は対象ハンドの参加者でなければならない
- 同一 `handId` に対する投稿は 1 件のみ

### エラーレスポンス

#### 400 Validation Error
```ts
type ValidationErrorResponse = {
  error: {
    code: "VALIDATION_ERROR";
    message: "invalid input";
    fields: Record<string, string>;
  };
};
```

例:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "invalid input",
    "fields": {
      "title": "too_long",
      "freeTags": "duplicate"
    }
  }
}
```

#### 401 Unauthorized
```json
{
  "message": "Unauthorized"
}
```

#### 403 Guest User
```json
{
  "message": "Guest users cannot access this resource"
}
```

#### 403 Not Participant
```json
{
  "message": "Not a participant"
}
```

#### 409 Already Posted
```ts
type HandAlreadyPostedResponse = {
  error: {
    code: "HAND_ALREADY_POSTED";
    postId: string;
  };
};
```

例:
```json
{
  "error": {
    "code": "HAND_ALREADY_POSTED",
    "postId": "4d8a3b77-6d76-4f4d-b98a-123456789abc"
  }
}
```

## 投稿時の保存先データ

### hand_archive_posts
保存される主な項目:
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
保存される主な項目:
- `post_id: string`
- `tag_key: string`

### hand_archive_post_free_tags
保存される主な項目:
- `post_id: string`
- `tag_text: string`
- `tag_norm: string`

## 投稿後に呼ばれる詳細取得

### エンドポイント
- `GET /api/gallery/posts/:postId`

### 用途
- 投稿直後に Gallery Detail 画面で詳細表示する

### レスポンス型
```ts
type GalleryDetailResponse = {
  postId: string;
  title: string;
  authorTags: {
    fixed: string[];
    free: string[];
  };
  viewerTags: {
    public: string[];
    mine: string[];
  };
  focusPoint: "Preflop" | "Flop" | "Turn" | "River" | null;
  handReplay: {
    handId: string;
    roomId: string | null;
    matchId: string | null;
    handNoInMatch: number | null;
    playedAt: string;
    handStartedAt: string | null;
    mode: string;
    maxPlayers: number;
    buttonSeat: number;
    sbSeat: number;
    bbSeat: number | null;
    stakes: unknown;
    initialStacks: unknown;
    finalStacks: unknown;
    boardCards: unknown[];
    actions: unknown[];
    result: unknown;
    roomSnapshot: unknown;
    integrityHash: string | null;
    participants: Array<{
      handParticipantId: string;
      handId: string;
      userId: string | null;
      username: string | null;
      seat: number;
      role: string;
      joinedAtHandStart: boolean;
      leftBeforeHandEnd: boolean;
      holeCards: unknown[] | null;
      showedHoleCards: boolean;
      foldedStreet: string | null;
      netResultPoints: number | null;
      startingStackPoints: number | null;
      endingStackPoints: number | null;
      isWinner: boolean;
    }>;
  } | null;
  createdAt: string;
  isOwner: boolean;
  status?: string;
  privateNote?: string | null;
  metrics?: {
    likeCount: number;
    viewsTotal: number;
    viewsUnique: number;
    dwellMsTotal: number;
    dwellMsAvg: number;
  };
};
```

## フロント実装上の補足
- 投稿作成関数
  - `createGalleryPost(apiBase, payload)`
- 投稿画面コンポーネント
  - `GalleryCreateView`
- 投稿成功時のフロント処理
  - レスポンス `postId` を `onCreated(postId)` に渡す
  - 親で `galleryPostId` を保持し、Gallery Detail へ遷移する
- 投稿失敗時のフロント処理
  - API エラー payload の `error.message` を優先表示する
  - 取得できない場合は `"Failed to save"` を表示する
