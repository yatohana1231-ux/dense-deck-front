# 01 System Overview

## 対象範囲
- フロントエンド (Vite + React)
- APIサーバ (Fastify)
- DB (PostgreSQL + Prisma)
- WebSocketによるリアルタイム更新

## アプリの前提と制約 (実装準拠)
- 4人卓固定 (最大4席)
- シングルブラインド (BBのみ、SBなし)
- NLHEベースのルール
- オンライン対戦はルーム制のみ
- 観戦はIN_HAND中は不可 (WS接続制限)

## 主要コンポーネント
- フロント: 画面遷移はアプリ内stateで制御
- API: 認証、ルーム操作、ハンド進行、履歴保存
- DB: ユーザー/セッション/ハンド履歴/参加者/マッチ

## 環境変数・接続
- フロント: `VITE_API_BASE` (APIベースURL)
- API: `HOST`, `PORT`, `DATABASE_URL`, `COOKIE_SECRET`

## セッション/認証の基本
- Cookie名: `dd_session`
- 有効期限: 90日 (スライディング更新)
- `secure: true`, `httpOnly: true`, `sameSite: lax`
- APIでセッションを読み込むたびに有効期限を更新

## 画面フロー概要
- 起動時に `/api/auth/me` で確認
- 未ログイン時は `/api/auth/guest` でゲスト作成
- Top -> Room List -> Room Detail -> Online Table
- Hand History -> Replay
- Account/Username/Reset/Login/Register 画面
