# Dense Deck Simulator  
## アウトプット仕様（MVP）

本シミュレータは、Dense Deck / Super Dense Deck における  
**ハンド配布・ボード生成・棄却処理が仕様どおりに機能しているか**、  
および **仕様自体が公平性を損なっていないか** を検証することを目的とする。

本書では、シミュレータが出力すべき **アウトプット要件** を定義する。

---

## 0. 用語定義

- **combo**  
  52枚のカードからなる2枚組（1326通り）

- **classKey**  
  プリフロップ169分類（AA, AKo, AKs, ...）

- **seat**  
  プレイヤーのポジション  
  例：4max = UTG / CO / BTN / BB

---

## 1. 基準分布（Baseline）

シミュレーション結果は、以下の基準分布と比較される。

### 1.1 Baseline A（理論基準）
**目的：実装と仕様のズレ検出**

- 入力：`handWeights.json`（mode別）
- classKey の期待比率は以下で定義する：

```
effectiveWeight(classKey) = weight(classKey) × combos(classKey)
```

- 全 classKey の effectiveWeight を正規化し、期待確率とする
- 1326 combo への割り当ては **同一 classKey 内で一様** とする

#### 出力
- `baselineA.classKeyExpected[169]`
- `baselineA.comboExpected[1326]`

---

### 1.2 Baseline B（公平性検証基準）
**目的：仕様の公平性検出**

#### B1：通常ホールデム基準（外部基準）
- 1326 combo は完全一様
- ボード分布は通常ホールデムの理論値または既知値

出力：
- `baselineB1.comboExpected[1326]`
- `baselineB1.boardTextureExpected`

#### B2：手順公平性基準（内部基準）
- 同一の配布実装を使用
- `handWeights` を全て 1 に設定
- Dense Deck の配布手順そのものが **座席間で公平か** を検証する

出力：
- `baselineB2.observedCombo[1326]`
- `baselineB2.observedComboBySeat[seat][1326]`
- `baselineB2.boardTextureObserved`

---

## 2. 観測分布（Observed）

対象：mode別（dense / superDense）

### 2.1 ハンド分布（全1326 combo）
- `observed.comboCount[1326]`
- `observed.comboRate[1326]`（正規化済み）

補助出力（推奨）：
- `observed.classKeyCount[169]`
- `observed.classKeyRate[169]`

---

### 2.2 ポジション別ハンド分布
- `observed.bySeat[seat].comboCount[1326]`
- `observed.bySeat[seat].comboRate[1326]`

補助出力（任意）：
- `observed.bySeat[seat].classKeyRate[169]`

※カウント単位は **プレイヤー単位** とする  
（1ハンド = プレイヤー数分のサンプル）

---

## 3. 偏り（差分）レポート

### 3.1 観測値 vs Baseline A
**目的：実装ズレ検出**

- `deltaA.combo.absDiff[1326]`
- `deltaA.combo.relDiff[1326]`
- （任意）`deltaA.classKey.absDiff[169]`

サマリ：
- `deltaA.summary.maxAbsDiffCombo`
- `deltaA.summary.topKComboAbsDiff`
- `deltaA.summary.chi2LikeScore`（厳密な検定である必要はない）

---

### 3.2 観測値 vs Baseline B
**目的：仕様公平性検出**

#### vs B1（通常ホールデム）
- `deltaB1.boardTextureDiff`
- （任意）ランク・スート等の周辺分布差分

#### vs B2（手順公平性）
- `deltaB2.seatBias`
  - `seatBias.maxAbsDiffAcrossSeats`
  - `seatBias.topKSkewedCombos`

---

## 4. ボード分布チェック

MVPではテクスチャを最低限に限定する。

### 4.1 フロップ・スート構成
- rainbow
- two-tone
- monotone

### 4.2 フロップ・ペア構成
- unpaired
- paired

### 4.3 5枚全体のスート構成（任意）
- 例：3-1-1 / 2-2-1 / 3-2 など

出力：
- `observed.boardTexture`
- `baselineB1.boardTextureExpected`
- `deltaB1.boardTextureDiff`

---

## 5. 棄却・失敗・falldown

### 5.1 棄却率（Reject）
- `rejection.meanRejectsPerHand`
- `rejection.p95RejectsPerHand`
- `rejection.maxRejectsPerHand`
- （任意）`rejection.meanRejectsPerSeat`

---

### 5.2 失敗率（Timeout / Fail）
- `failure.failedHands`
- `failure.failedHandRate`

---

### 5.3 falldown 発生率
- `falldown.falldownHands`
- `falldown.falldownRate`
- （任意）`falldown.bySeatRate`

※MVP段階では falldown は OFF でも良いが、  
**発生条件とカウント定義は仕様として固定すること**

---

## 6. 実行サマリ

- `run.mode`
- `run.numHands`
- `run.numPlayers`
- `run.seed`
- `run.elapsedMs`

---

## 7. 出力形式

- `report.json`  
  全アウトプットを含む完全レポート

- `summary.json`  
  差分サマリ・棄却率・重要指標のみ

- （任意）`topk.csv`  
  偏り上位K件（調整・可視化用）

---

## 8. 本仕様の位置づけ

本仕様は **配布ロジック検証用シミュレータ（MVP）** を対象とする。  
アクション、勝敗、EV、ボード×ハンド相関などの高度指標は  
別フェーズで拡張する。
