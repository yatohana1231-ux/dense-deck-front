# Dense Deck Simulator  
## インプット仕様（MVP）

本仕様は、Dense Deck / Super Dense Deck の配布ロジック検証用  
シミュレータに与える **入力（設定）仕様** を定義する。

本シミュレータは以下を目的とする：
- Baseline A：**実装と仕様のズレ検出**
- Baseline B：**仕様の公平性検出**

---

## 1. 入力形式

- 形式：JSON
- ファイル例：`sim_config.json`
- 再現性確保のため、**seed の指定を必須推奨**とする

---

## 2. 実験条件（必須）

### 2.1 モード・試行条件
| フィールド | 型 | 説明 |
|---|---|---|
| `mode` | string | `"dense"` または `"superDense"` |
| `numHands` | int | シミュレーション試行回数 |
| `numPlayers` | int | プレイヤー人数（MVPでは 4 固定） |
| `seed` | int | 乱数シード（再現性確保用） |

---

## 3. データソース（必須）

### 3.1 ハンド重み
| フィールド | 型 | 説明 |
|---|---|---|
| `weightsPath` | string | `handWeights.json` へのパス |

- mode 別の重みを内部で参照する前提とする

---

## 4. 配布アルゴリズム設定（必須）

### 4.1 ボード先取り設定
| フィールド | 型 | 説明 |
|---|---|---|
| `boardReserveCount` | int | ボード用に先取りするカード枚数 |

- **MVPでは 10 固定**  
  （フロップ・ターン・リバーの全候補を確保）

---

### 4.2 棄却制御（Reject Limit）
| フィールド | 型 | 説明 |
|---|---|---|
| `rejectLimit.perSeat` | int | 1席あたりの最大棄却回数 |
| `rejectLimit.perHand` | int | 1ハンド全体の最大棄却回数 |

- **MVP推奨値**
  - `perSeat = 300`
  - `perHand = 2000`

---

### 4.3 falldown 設定
| フィールド | 型 | 説明 |
|---|---|---|
| `falldownPolicy` | string | `"off"` / `"uniform2"` / `"renormalize"` |

- **MVPでは `"off"` 固定**
- `"off"` の場合、棄却上限到達は失敗（fail）として扱う
- 将来拡張時のため、falldown の種類は列挙しておく

---

## 5. Baseline 設定（必須）

### 5.1 Baseline A（理論基準）
**目的：実装と仕様のズレ検出**

| フィールド | 型 | 説明 |
|---|---|---|
| `baselineA.enabled` | boolean | 有効化フラグ |
| `baselineA.comboAllocation` | string | `"uniformWithinClass"` 固定 |

- classKey 内の combo は一様に割り当てる

---

### 5.2 Baseline B1（通常ホールデム）
**目的：仕様が通常ホールデムから逸脱していないかの確認**

| フィールド | 型 | 説明 |
|---|---|---|
| `baselineB1.enabled` | boolean | 有効化フラグ |
| `baselineB1.boardTextureSource` | string | `"sim"` 固定 |
| `baselineB1.uniformHandsForBoardSim` | int | 一様配布シミュレーション回数 |

- **MVPでは `"sim"` 固定**
- 推奨値：`200000` 以上

---

### 5.3 Baseline B2（手順公平性）
**目的：配布手順そのものの公平性検証**

| フィールド | 型 | 説明 |
|---|---|---|
| `baselineB2.enabled` | boolean | 有効化フラグ |
| `baselineB2.numHands` | int | 試行回数 |
| `baselineB2.seed` | int | 乱数シード |

- 配布実装は同一
- `handWeights` をすべて 1 として実行
- `seed` 未指定時は本番 seed + 1 など規約で補完してもよい

---

## 6. 出力設定（任意だが推奨）

| フィールド | 型 | 説明 |
|---|---|---|
| `outputDir` | string | 出力ディレクトリ |
| `writeReportJson` | boolean | 完全レポート出力 |
| `writeSummaryJson` | boolean | サマリ出力 |
| `writeTopKCsv` | boolean | 上位K差分CSV出力 |
| `topK` | int | 上位K件数 |

---

## 7. デバッグ・安全装置（任意）

| フィールド | 型 | 説明 |
|---|---|---|
| `logLevel` | string | `"error" | "warn" | "info" | "debug"` |
| `captureExamples.enabled` | boolean | 失敗例保存 |
| `captureExamples.maxHands` | int | 保存する最大件数 |
| `timeLimitMs` | int | 実行全体のタイムリミット |

---

## 8. 設定例（MVP）

```json
{
  "mode": "dense",
  "numHands": 500000,
  "numPlayers": 4,
  "seed": 123456,

  "weightsPath": "./data/handWeights.json",

  "boardReserveCount": 10,

  "rejectLimit": {
    "perSeat": 300,
    "perHand": 2000
  },

  "falldownPolicy": "off",

  "baselineA": {
    "enabled": true,
    "comboAllocation": "uniformWithinClass"
  },

  "baselineB1": {
    "enabled": true,
    "boardTextureSource": "sim",
    "uniformHandsForBoardSim": 200000
  },

  "baselineB2": {
    "enabled": true,
    "numHands": 250000,
    "seed": 123457
  },

  "outputDir": "./out/run_dense_500k_seed123456",
  "writeReportJson": true,
  "writeSummaryJson": true,
  "writeTopKCsv": true,
  "topK": 50,

  "logLevel": "info"
}
```

## 9. 本仕様の位置づけ

- 本仕様は 配布ロジック検証用シミュレータ（MVP） を対象とする
- アクション・勝敗・EV・ボード×ハンド相関分析は対象外
- 拡張時にも互換性を保つため、不要項目は無視可能な設計とする
