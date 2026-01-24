# hand_records（ハンド履歴本体）

## 概要
- 1ハンド = 1レコード
- プレイヤー人数に依存しない「客観ログ」
- user_id は一切持たない

---

## カラム定義

### 識別・紐付け
- hand_id (PK)
  - UUID / ULID
  - サーバー生成
- room_id (FK, nullable)
  - どのルームで行われたハンドか
- match_id (FK, nullable)
  - 連戦セッション単位
  - 条件変更時などにセッションが切り替わる
- hand_no_in_match (int, nullable)
  - match内での連番（1始まり）

### 時刻
- played_at (datetime)
  - HAND_END 時点
  - サーバー側で確定

---

### ゲーム設定
- mode (enum)
  - dense / superDense / etc
- max_players (tinyint)
  - MVPは4固定
  - 将来的には可変
- button_seat (tinyint)
- sb_seat (tinyint)
- bb_seat (tinyint, nullable)
- stakes_json (json)
  - 例: { "sb":1, "bb":2 } / { "blind":1 }

---

### スタック情報
- initial_stacks_json (json)
  - HAND_START 時点
- final_stacks_json (json, optional)

---

### 盤面・進行
- board_cards_json (json array)
  - 最終採用された0〜5枚
- actions_json (json)
  - 全アクションの時系列ログ
- result_json (json)
  - 勝者・ポット配分・ショーダウン結果

---

### スナップショット
- room_snapshot_json (json)
  - roomTag
  - hasPassword
  - rule（single blind 等）
  - initialStackBB

---

### その他
- integrity_hash (string, optional)
  - 改ざん検出用途

---

## 入力ルール
- hand_id / played_at はクライアント入力禁止
- actions_json は順序保証必須
- room_snapshot は HAND_START 時点の値を保存

---

## インデックス・制約
- INDEX(room_id, played_at DESC)
- INDEX(match_id, hand_no_in_match)
- UNIQUE(match_id, hand_no_in_match)


# hand_participants（ユーザー×ハンド突合）

## 概要
- 「誰がこのハンドに参加していたか」を示す
- user視点の履歴一覧・権限管理の起点
- 例）3人参加のハンドであれば、hand_idに対して3つのuser_idが紐づくhand_participant_idが生成される 

---

## カラム定義

### 識別
- hand_participant_id (PK)
- hand_id (FK)
- user_id (FK)

---

### 参加情報
- seat (tinyint)
- role (enum)
  - player / observer
- joined_at_hand_start (bool)
- left_before_hand_end (bool)

---

### カード・結果
- hole_cards_json (json array)
  - 2枚
- showed_hole_cards (bool)
- folded_street (enum, nullable)
  - PREFLOP / FLOP / TURN / RIVER / SHOWDOWN
- net_result_bb (int / decimal)
- starting_stack_bb (optional)
- ending_stack_bb (optional)
- is_winner (bool)

---

## 入力ルール
- (hand_id, user_id) は一意
- (hand_id, seat) は一意
- seat は hand_records と一致必須
- hole_cards を保存しても、表示制御で秘匿可能

---

## インデックス・制約
- UNIQUE(hand_id, user_id)
- UNIQUE(hand_id, seat)
- INDEX(user_id, hand_id DESC)
- INDEX(hand_id)

# match_sessions（連戦セッション）

## 概要
- ルーム内の「連続した対戦の塊」
- room_id だけでは区切れない問題を解消

---

## カラム定義
- match_id (PK)
- room_id (FK)
- created_at (datetime)
- ended_at (datetime, nullable)
- config_snapshot_json (json)
  - 開始時点のルーム条件

---

## 運用ルール
- ルーム作成〜解散を1matchにするのが最小構成
- ルーム条件変更時に match を切ると安全

# ハンド履歴 保存フロー

## 保存タイミング
- HAND_END（勝者・配分確定後）

---

## 処理順（トランザクション）
1. hand_records INSERT
2. hand_participants BULK INSERT
3. COMMIT

---

## 例外ケース
- 切断・途中退出があっても
  - HAND_START 時点で参加していた user は participants に残す
- 棄却（deck reject）は保存対象外
  - 最終採用ハンドのみ保存

---

## 原則
- hand_records は客観ログ
- hand_participants は主観インデックス
- user_id は hand_records に持たせない

# 設計思想メモ

- hand_records = 神の視点（事実）
- hand_participants = 人間の視点（関与）

この分離により：
- PvP対応
- アーカイブ共有
- 視点切替リプレイ
- 悲喜劇ハンド演出

が自然に成立する

