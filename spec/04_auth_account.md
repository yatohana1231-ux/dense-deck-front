# 04 Auth / Account

## ゲスト開始
- 起動時に `/api/auth/me` を呼び出し
- セッションなしなら `/api/auth/guest` で自動作成

## ゲスト
- ランダムな `Player-xxxxxx` を生成
- `users.status=ANONYMOUS` として作成
- ゲストでも履歴はuserIdで保存
- guest判定は `user.status===ANONYMOUS` を利用（`sessions.is_guest` は不使用）

## 登録
- `POST /api/auth/register`
- password 必須 (6文字以上)
- username / email は任意
- ゲストの場合は同一userIdのまま登録へ昇格
- 今回実装では `email` ありで `status=VERIFIED`、`email` なしで `status=PROVISIONAL`

## ログイン
- `POST /api/auth/login`
- username + password

## ログアウト
- `POST /api/auth/logout`
- セッション削除 + cookie削除
- `users.last_connected_at` を更新

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

## アカウント(email)更新
- `PUT /api/user/account`
- `status=PROVISIONAL` のみ更新可
- req: `email`
- 更新時は `status=VERIFIED` に遷移

## 接続時刻
- `users.last_connected_at`
- ログイン成功、ログアウト、セッション期限切れ時に更新
