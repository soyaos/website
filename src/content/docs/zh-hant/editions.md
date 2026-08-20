---
title: 版本
description: 同一份二進位衍生出的六種部署型態——從 Solo 到 Enterprise Private。
order: 3
category: getting-started
---

SoyaOS 是一份二進位。所謂*版本*,就是部署型態——節點角色跑在哪裡、由誰維運、它們怎麼聯邦。變的只有一行 CLI 參數。

```bash
soyaos start --edition solo      # 或 cluster | cloud | hybrid | ent-cloud | ent-private
```

## 矩陣

| 版本                 | 控制面(Planet)                    | 資料面(Comet)                          | 適用對象                              | 典型成本                       | 狀態        |
| -------------------- | ---------------------------------- | -------------------------------------- | ------------------------------------- | ------------------------------ | ----------- |
| `solo`               | 行程內                             | 行程內                                 | 一個開發者、一台筆電                   | 免費 · 你的硬體                | alpha 在用  |
| `cluster`            | 自管 Planet 在你的 VPS             | 自管 Comet 在你的 LAN / VPC            | 一個團隊 + 一台 VPS + 內網裝置         | 約 $0.10 / Comet·小時(估)      | 規劃中      |
| `cloud`              | soyaos.ai 代管 Planet              | soyaos.ai 代管 Comet                   | 註冊、拿 API Key、開工                 | 按 token + 按 Comet·秒         | 規劃中      |
| `hybrid`             | soyaos.ai 代管 Planet              | 你 VPC / 自有機房裡的 Comet            | SaaS Planet,你自己的 Moon              | 按 token(只算控制面)           | 規劃中      |
| `ent-cloud`          | 獨佔 Planet(依 region 綁定)        | 獨佔 Comet 池                          | 多租戶 SaaS + SSO + SLA                | 聯絡我們                       | 規劃中      |
| `ent-private`        | 客戶自管 Planet                    | 客戶自管 Comet                         | 本地化 / 實體隔離網路                  | 年度授權                       | 規劃中      |

> 所有版本都跑**同一份 SoyaPack** 格式,對外暴露**同一份 OpenAI 相容** API。唯一變化是「你維運」與「我們維運」的邊界畫在哪裡——在 `solo` 裡這兩端摺疊到筆電上的一個行程。

## 決策樹

按列往下比對,第一個命中的就選;新手預設 **solo**。

| 如果……                                                              | ……選         |
| -------------------------------------------------------------------- | ------------- |
| 我只是想在筆電上試一下。                                             | `solo`        |
| 小團隊,能自己跑 VPS,資料要留在自己的硬體上。                         | `cluster`     |
| 不想維運任何東西——給我一個 API Key 就行。                            | `cloud`       |
| 用 SoyaOS 的大腦,但工作負載留在自己的硬體上。                        | `hybrid`      |
| 給我們的客戶做多租戶 SaaS,要 SSO / SLA / SOC 2。                     | `ent-cloud`   |
| 銀行 / 實驗室 / 強監管產業,出網預設拒絕。                            | `ent-private` |

## 各版本細讀

### `solo` — 所有東西都在行程裡

Planet、Moon、Comet 摺疊成機器上的單一行程。無註冊中心、無鑑權、無網路面。感受 SoyaOS 最快的方式,也是我們測試最深的型態。

- **狀態儲存**:`~/.local/share/soyaos/` 下的 SQLite(Windows 是 `%LOCALAPPDATA%`)。
- **鑑權**:無。行程只監聽 `127.0.0.1`。
- **上限**:只受硬體限制。我們在一台 2018 MacBook Air 上跑過。

### `cluster` — 一個你跑的 Planet + 你擴的 Comet

新創期工程團隊的預設型態。一台小 VPS 跑 Planet;Comet 工作節點用 `soyaos join` 接入。SoyaPack 清單倉庫放在任意 S3 相容儲存。

- **狀態儲存**:Postgres(推薦),小團隊也可用 SQLite。
- **鑑權**:初期共享組織 token,長大後切 OIDC。
- **網路**:Comet 只需對 Planet 出網 HTTPS;不需要可入站。

### `cloud` — 代管 Planet + 代管 Comet

我們維運一切,你只持有 API Key。「拿到一個能跑的 Agent endpoint」最快的路徑。隨時切到自己的 BYOK 模型 Key,自此只為我們實際排程的算力付費、不再為推理付費。

- **Region**:alpha → beta 期間待定。
- **資料**:傳輸與儲存都加密;我們不在你的資料上訓練。

### `hybrid` — 代管 Planet,你的 Comet

編排在雲端,工作負載留在你的邊界內。適合資料出不去、又不想自己維運控制面的情境。Comet 只需對我們 Planet 出網 HTTPS。

- **何時用**:HIPAA / PCI /「客戶資料不出 VPC」這類約束。
- **何時別用**:你還想把稽核日誌也放在自己機器上——那就直接選 `ent-private`。

### `ent-cloud` — 獨佔多租戶 SaaS

獨佔 region、SSO/SAML、SOC 2 合規、簽名稽核日誌匯出。和 `solo` 同一個核心——差別只在維運。按年付席次 + MSA 合約。

### `ent-private` — 本地化或實體隔離

同一份二進位部署進封閉網路。透過簽名離線升級包更新。已在出網預設拒絕的銀行、實驗室環境裡驗證過。簽名 Key 在客戶手裡——我們沒有後門。

## 切換版本

沒有「另裝一份」這種事——`soyaos` 是同一份二進位。切換只是改一個設定參數。版本間遷移設計為**非破壞性**:SoyaPack、能力白名單、Scope 事件都能 round-trip。

| 從           | 到           | 變了什麼                                                             |
| ------------ | ------------ | -------------------------------------------------------------------- |
| `solo`       | `cluster`    | 狀態從本地 SQLite → Postgres;Comet 指向 Planet URL。                  |
| `cluster`    | `cloud`      | 把 SoyaPack 重新發布到我們倉庫;API Key 切到我們的。                  |
| `cluster`    | `hybrid`     | Comet 不動;Planet URL 切到我們的。                                   |
| `cloud`      | `hybrid`     | 在你 VPC 裡起 Comet;只切 Comet 一端。                                |
| `*`          | `ent-private`| 人工——聯絡我們。實體隔離意味著我們寄你一份簽名離線包。                |

`solo` → `cluster` 實際切換長這樣:

```bash
# 在你的 VPS 上:
soyaos start --edition cluster --bind 0.0.0.0:8443 --state postgres://...

# 在你之前跑 solo 的筆電上:
soyaos pack push hello                                # 把 SoyaPack 發布到新 Planet
soyaos join --moon https://moon.example.com --token <invite>
```

## 跨版本不變的東西

- **SoyaPack 格式**(`soyapack.yaml` v0)。
- **OpenAI 相容 surface** 在 `/v1/chat/completions`。
- **能力白名單**——同一種形狀,同一份強制。
- **Scope 事件 schema**——你的儀表板、告警、稽核日誌都預期同一份 JSON。
- **CLI 命令**——`pack`、`run`、`serve`、`auth`、`join`。只是參數不同。

矩陣背後的 Planet / Moon / Comet 模型,見[架構](./architecture.md)。
