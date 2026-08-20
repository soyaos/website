---
title: SoyaPack v0 清單
description: soyapack.yaml v0 清單參考——欄位、能力、完整範例、常見陷阱。
order: 1
category: reference
---

`soyapack.yaml` 是 SoyaOS 套件的唯一權威來源。v0 凍結了下面這一小套欄位;後續版本只新增、絕不移除。一個 pack 還帶 prompt 檔、可選範本、範例 fixture——但合約只看清單。

## 頂層欄位

| 欄位                | 型別     | 必填               | 說明                                                                                |
| ------------------- | -------- | ------------------ | ----------------------------------------------------------------------------------- |
| `apiVersion`        | string   | 是                 | 必須為 `soyaos.ai/v0`。                                                              |
| `kind`              | enum     | 是                 | `Agent` / `Tool` / `Skill` / `Model` 之一。                                          |
| `name`              | string   | 是                 | DNS 標籤安全;同一 owner 下唯一。                                                    |
| `version`           | string   | 是                 | SemVer 2.0.0(允許 pre-release,如 `0.1.0-alpha.0`)。                                 |
| `virtual_model_id`  | string   | Agent 類型必填     | 該 Agent 宣告的 `soya:*` id(如 `soya:compo`)。                                       |
| `description`       | string   | 是                 | 一句話摘要。                                                                         |
| `owner`             | string   | 是                 | GitHub 個人或組織。                                                                  |
| `license`           | string   | 是                 | SPDX 識別符(`MIT`、`Apache-2.0`……)。                                                |
| `capabilities`      | object   | 是                 | 能力白名單——出網主機、檔案系統路徑、確定性層級。詳見下文。                           |
| `inputs`            | object   | 是                 | 描述輸入契約的 JSON Schema 片段。                                                    |
| `outputs`           | object   | 是                 | 產出名稱 → schema id 的對應(如 `guide.v1`)。                                         |
| `prompts`           | object   | Agent 類型必填     | stage 名 → 提示詞檔案相對路徑。                                                      |
| `tools`             | object   | 選用               | 工具名 → 宣告(內建或外部)。                                                          |
| `templates`         | object   | 選用               | 範本名 → `html/template` 檔案路徑。供產物渲染器使用。                                |
| `examples`          | object   | 選用               | 範例名 → 測試案例檔。會被 `soyaos pack lint` 偵測。                                  |

## `capabilities`

能力區塊由 Comet 在執行時強制、Moon 在 push 時稽核。套件不能做任何這裡沒宣告的事——預設 fail-closed。

```yaml
capabilities:
  egress:
    - host: api.openai.com
      port: 443
      protocol: https
  fs:
    read:
      - /workdir
    write:
      - /workdir/out
  determinism_tier: read-only   # 取值:read-only | side-effect | unrestricted
```

- `egress`:顯式白名單,沒有任何隱式 `0.0.0.0/0`。萬用字元(`*.openai.com`)接受但不鼓勵——越窄越安全。
- `fs.read` / `fs.write`:Comet 沙箱*內部*的絕對路徑。`/workdir` 永遠可用;其餘都要宣告。
- `determinism_tier`:宣告 Agent 的可重現層級。Comet 用它決定快取策略:
  - `read-only`——相同輸入總是產生相同輸出(上游 LLM 的非確定性除外)。可快取。
  - `side-effect`——為可觀測副作用碰網路(建 Linear issue、發 Slack)。永不快取。
  - `unrestricted`——逃生口。除非有理由,否則別用。

完整強制模型見[能力與沙箱](../concepts/capabilities-sandbox.md)。

## 一個完整的範例

一個簡單的「文章摘要」Agent:抓一個 URL,讓上游 LLM 提煉要點,產出 `summary.v1` 產物:

```yaml
# soyapack.yaml
apiVersion: soyaos.ai/v0
kind: Agent
name: research-summarizer
version: 0.1.0
virtual_model_id: soya:research-summarizer
description: 抓一篇文章,產出 5–10 條要點。
owner: chzealot
license: MIT

capabilities:
  egress:
    - host: api.openai.com
      port: 443
      protocol: https
    - host: example.com           # 抓取工具可能訪問的任何主機
      port: 443
      protocol: https
  fs:
    read:
      - /workdir
    write:
      - /workdir/out
  determinism_tier: read-only

inputs:
  type: object
  required: [url]
  properties:
    url:
      type: string
      format: uri
      description: 要摘要的文章 URL。
    max_bullets:
      type: integer
      default: 8
      minimum: 3
      maximum: 12

outputs:
  summary: summary.v1            # schema 在另一個倉庫裡宣告

prompts:
  extract: prompts/extract.md
  summarize: prompts/summarize.md

tools:
  fetch:
    kind: builtin.http_get
    params:
      timeout: 15s
      max_bytes: 2_000_000

examples:
  short_blog:
    input: { url: "https://example.com/post", max_bullets: 5 }
  long_essay:
    input: { url: "https://example.com/essay", max_bullets: 12 }
```

兩個提示詞檔(`prompts/extract.md`、`prompts/summarize.md`)和清單放在一起。`fetch` 工具是內建的 HTTP getter;兩條 `egress` 精確授權它能去哪。

## 常見陷阱

**egress 太寬。** `host: "*"` 技術上合法但破壞安全模型。Comet 接受,但 `pack lint --strict` 會標紅。把 `egress` 收窄到範例實際需要的範圍。

**寫入 `/workdir/out` 之外的路徑。** Comet 沙箱讓 `/workdir` 可寫但只允許 `fs.write` 裡宣告的路徑。直接往 `/workdir` 寫(沒列出來)會觸發 `capability violation: fs.write`,執行中斷。

**`determinism_tier: side-effect` 但沒做冪等。** 如果你的 Agent 每次跑都發 Slack,你會刷屏。要嘛在呼叫裡塞冪等 Key(推薦),要嘛明確把「重跑就該重發」設計進去。

**`kind: Agent` 但忘了寫 `virtual_model_id`。** Moon 要知道怎麼把 `soya:<id>` 請求路由到你的套件。校驗會攔截,但這是常見絆倒點。

**SemVer pre-release 不小心被推到生產。** `0.1.0-alpha.0` 在 staging 沒問題;切生產流量前升到 `0.1.0`。Comet 把 `*-alpha.*` 版本看作「不穩定,少快取」。

**examples 和 inputs schema 漂移。** `pack lint` 會把 fixture 拿 `inputs` JSON Schema 比對。新加了必填欄位忘了更新 fixture,lint 警告。`--strict` 讓它 fail。

## 校驗

```bash
soyaos pack validate .
```

校驗器就是 Comet 准入時跑的同一份程式碼。[soyaos/skills](https://github.com/soyaos/skills) 的 CI 在每個 PR 上都會呼叫它。

更深的檢查(範例覆蓋、能力收斂度)用:

```bash
soyaos pack lint . --strict
```

## v1 會加什麼?

v1 只**新增**這些欄位(絕不移除或重新指定 v0 欄位):

- `secrets:`——具名、按 env 綁定、帶輪換策略的祕密宣告。
- `sla:`——每個階段的逾時 / 成本預算上限。
- `signed_by:`——加密溯源,搭配 `soyaos pack sign`。
- `compat:`——最低 runtime 版本,選用 feature flag。

v1 ship 時 v0 的套件不用改任何東西。
