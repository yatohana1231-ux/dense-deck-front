# 04 Auth / Account

## ゲスト開始
- 起動時に `/api/auth/me` を呼び出し
- セッションなしなら `/api/auth/guest` で自動作成

## ゲスト
- ランダムな `Player-xxxxxx` を生成
- ゲストでも履歴はuserIdで保存

## 登録
- `POST /api/auth/register`
- email + password (6文字以上)
- usernameは任意 (later指定で後回し)
- ゲストの場合は同一userIdのまま登録へ昇格

## ログイン
- `POST /api/auth/login`
- email + password

## ログアウト
- `POST /api/auth/logout`
- セッション削除 + cookie削除

## username変更
- `POST /api/user/username`
- 1回のみ変更可能
- 1-20文字 / `[A-Za-z0-9_.-]` のみ
- 重複は409

## パスワードリセット
- `POST /api/password/reset/request`
  - emailが存在する場合のみtoken作成 (レスポンスは常にOK)
- `POST /api/password/reset/confirm`
  - token + password
  - token有効期限: 1時間
  - 使用済み/期限切れはエラー

## パスワード変更
- `PUT /api/user/password`
- 認証必須（ゲスト不可）
- req: `currentPassword`, `newPassword`, `confirmPassword`
- newPasswordは6文字以上
