# ハンド履歴 & アーカイブ投稿仕様 v0.1  
Dense Deck Poker – Hand Record & Archive System

## 1. スコープと位置づけ

本仕様は、Dense Deck Poker の MVP における  
**「ハンド履歴」および「アーカイブ投稿」機能**を定義する。

- 対象モード  
  - 4max / シングルブラインド  
  - Super Dense / Dense / Full (将来互換)

- 本仕様の目的  
  - プレイヤー自身のプレイを再生・振り返り可能にする  
  - 優れたハンドをアーカイブへ投稿し、後に閲覧・評価できるようにする

ハンド履歴は **本人のみ閲覧可能な非公開領域**  
アーカイブは **プレイヤーが公開を選択したハンドのみ掲載される公開領域**  
として設計する。


# 用語定義（Terms）

## hand
1回のディール（プリフロップ〜ショーダウン）。

## handRecord（ハンド履歴）
ユーザーがプレイした全ハンドのログ。非公開・本人専用。

## archiveEntry（アーカイブ投稿）
ハンド履歴から選抜され、ユーザーが公開を選んだ投稿データ。

## category
アーカイブ投稿の分類。
- `standard` : 通常の戦術的ハンド
- `tragedyComedy` : 「悲喜劇ハンド」などの特別分類

## tagsUser
ユーザーが自由に付与するタグ。

## tagsInternal
システムが自動付与する内部タグ（将来拡張用）。

## hero
投稿したユーザー（本人視点のプレイヤー）。

## seats
UTG / CO / BTN / BB の着席位置。

---
# ハンド履歴仕様（Hand History Specification）

## 1. 保存単位
``handRecord`` という単位で保存する。

### 主キー
- `handId`（グローバル一意）
- `tableId`
- `playedAt`（UTC + ローカル）

---

## 2. 保存項目（MVP）

### (1) メタ情報
- `mode`: `"superDense" | "dense" | "full"`
- `stakes`: BB額
- `initialStacks[seat]`
- `seatPositions`
- `heroSeat`

### (2) プリフロップ
- `holeCards[seat]`
- `preflopActions[]`  
  - `{ order, seat, actionType, amount, potSizeAfter }`

### (3) フロップ / ターン / リバー
- `board`: flop / turn / river
- ストリート別アクションログ  
  `{ street, order, seat, actionType, amount, potSizeAfter }`

### (4) ショーダウン
- `showdownCards[seat]`
- `handRank[seat]`
- `winnerInfo[]`  
  - `{ seat, winAmount, sidePotId? }`

### (5) 結果
- `netResult[hero]`（±BB）
- `allinSpots[]`

---

## 3. 将来拡張フィールド（予約）
- `heroNotes`
- `tagsInternal[]`
- `equityAtAllin`

---
# ハンド履歴 UI（Hand History UI）

## 1. 一覧画面

### 表示項目
- 日時
- モード / ステークス
- ヒーローのポジション
- ハンド（例: A♠K♠）
- 収支（±BB）
- 「詳細を見る」
- 「アーカイブに投稿」

### フィルタ
- 日付範囲
- 勝敗（勝ち / 負け / ±閾値）
- モード（Super Dense / Dense）

---

## 2. 詳細画面（リプレイビュー）
- ボード表示
- ハンド表示（ショーダウンした相手のみ公開）
- ストリートごとのアクションログ
- 「次のアクション」「前のアクション」  
  ※自動再生はMVPでは実装しない

---
# アーカイブ投稿仕様（Archive Posting Specification）

## 1. 投稿対象
- 自分がプレイした handRecord のみ投稿可能（heroSeat 必須）

---

## 2. 投稿フロー（MVP）
1. ハンド履歴詳細画面を開く
2. 「アーカイブに投稿」ボタンを押す
3. 投稿フォーム表示  
   - `title`
   - `category`（standard / tragedyComedy）
   - `tagsUser[]`
   - `comment`
4. 送信 → archiveEntries に保存  
   （handId 参照方式でハンドデータ本体は複製しない）

---

## 3. archiveEntry データ構造

json
{
  "archiveId": "string",
  "handId": "string",
  "ownerUserId": "string",
  "visibility": "public",
  "title": "string",
  "category": "standard | tragedyComedy",
  "tagsUser": ["string"],
  "comment": "string",
  "createdAt": "datetime",
  "statsSnapshot": {
    "mode": "superDense",
    "stakes": 50,
    "heroSeat": "BTN",
    "netResultBB": 42,
    "allinStreet": "turn"
  }
}

# 匿名化ポリシー

- 投稿者以外には対戦相手の名前を非表示
    → Player2, Player3 などで置換

- 投稿者は匿名IDで表示

---

# アーカイブ UI（Archive UI）

## 1. 一覧画面
### 表示項目
- タイトル
- 投稿者（匿名ID）
- モード / ステークス
- ヒーローポジション
- 結果（±BB）
- カテゴリ・タグ
- 「詳細を見る」

### 並び順
- デフォルト: 新着順（createdAt DESC）
- 将来: 評価順 / 閲覧数順

---

## 2. 詳細画面
- リプレイビュー（ハンド履歴と同UIを再利用）
- 投稿メタ情報表示
  - タイトル
  - コメント
  - タグ

### 将来のUI要素（プレースホルダ）
- 「いいね」ボタン
- 評価タグ（上級者のレビュー）

---

# 公開範囲・権限ポリシー

## 1. ハンド履歴
- 完全に本人のみ閲覧可能

## 2. アーカイブ
- 投稿時点で公開扱い (`visibility = public`)
- 非公開アーカイブは v0.2 以降に検討

## 3. アカウント状態との連動
- 不正 / BAN などのケースでは  
  `isActive = false` により投稿を非表示にできるようにする

---
# 将来拡張フック（Future Extensions）

## 1. 評価・ランキング
- `viewCount`
- `likeCount`
- `score`（5段階など）
- 一定基準を満たしたハンドを  
  「殿堂入り（Gallery）」へ移行

---

## 2. 20ハンドまとめ表示
- `batchId` を handRecord に付与  
  → 20件の一覧＋最後の1件のみリプレイ、といったUIが可能

---

## 3. ラボ機能との接続
- 特定タグ付きアーカイブを元に  
  類似プリフロップの局面を再現する「確認場」を生成可能

---

## 4. GTO相関データ
- `equityAtAllin` などを後から自動計算して付与
- 投稿後でもバックフィル可能な拡張性を確保

---
