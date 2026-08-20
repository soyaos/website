---
title: Scope 事件與可觀測性
description: 每次 SoyaOS 執行都會發出的事件流,以及怎麼消費它們。
order: 3
category: concepts
---

SoyaOS 裡每次 Agent 執行都會發出一串 **Scope 事件**——按順序追加的 JSON 列,詳細到足以排障、稽核、重播。Scope 也是即時進度 UI、稽核日誌、外接 webhook 背後的底座。

## envelope

每條 Scope 事件都共享這個 envelope:

```json
{
  "kind":     "stage_started",
  "run_id":   "run_018f3a4b1c2d3e4f",
  "ts":       "2026-05-14T08:11:43.512Z",
  "pack":     "soya:compo@1.4.0",
  "tenant":   "acme",
  "comet":    "cmt-a3",
  "sig":      "ed25519:…"
}
```

- `kind` ——判別器。決定額外欄位有哪些。
- `run_id` ——ULID。一次執行內貫穿整條事件流。
- `ts` ——RFC 3339,毫秒精度,永遠 UTC。
- `pack` ——按實際解析的版本寫的完整套件引用。
- `tenant` ——Moon 租戶 ID;多租戶日誌彙總時有用。
- `comet` ——發出該事件的 Comet 實例。
- `sig` ——對該事件規範 JSON(去掉 `sig` 本身)的 Ed25519 簽名,由 Comet 的執行 Key 簽出。下游可驗證事件沒被篡改。

## 事件類型

健康的執行裡大致按這個順序出現:

| Kind                      | 何時發出                                                  | 關鍵額外欄位                               |
| ------------------------- | --------------------------------------------------------- | ------------------------------------------ |
| `run_started`             | Comet 接受一次執行。                                       | `inputs_hash`, `cache_mode`                |
| `stage_started`           | 一個 prompt / tool 階段開始。                              | `stage`                                    |
| `tool_called`             | 呼叫了一個宣告過的工具。                                   | `tool`, `args`, `tool_id`                  |
| `tool_completed`          | 工具回傳。                                                 | `tool_id`, `ok`, `duration_ms`             |
| `llm_request`             | 向上游 LLM 發出請求。                                      | `upstream`, `model`, `prompt_tokens`       |
| `llm_response`            | 上游回應完整接收。                                         | `upstream`, `completion_tokens`            |
| `artifact_written`        | Agent 在 `/workdir/out` 寫了一個產物。                     | `name`, `schema`, `size_bytes`             |
| `stage_completed`         | 階段正常退出。                                             | `stage`, `artifacts`                       |
| `capability_violation`    | 沙箱或能力檢查失敗。                                       | `surface`, `requested`, `matched`          |
| `error`                   | 未捕獲異常,或工具非零退出。                                | `stage`, `message`, `code`                 |
| `run_completed`           | 終結事件。**永遠**恰好發一次。                              | `ok`, `total_ms`, `artifacts`, `cost`      |

`run_completed` 即使在失敗時(`ok: false`)也會發。把它當「流結束」的訂閱者永遠不會掛死。

## 消費方式

### CLI 裡

```bash
soyaos --json run hello --input @hello.json | jq -c .
```

管道接 `jq`、`vector`、任意行式工具。輸出是換行分隔的 JSON("NDJSON")。

### OpenAI 相容客戶端

`/v1/chat/completions` 端點在 `stream: true` 時按 SSE 串流回傳。`data:` 幀是 OpenAI 形狀(`choices[0].delta.content`);Scope 事件在並行的 `x-soya-scope:` SSE 通道裡同步發,需要的客戶端可以一起訂。

### Webhook

Moon 可以設定成把一批 Scope 事件 POST 到 webhook URL:

```yaml
# moon.config.yaml(片段)
webhooks:
  - url: https://your-app.example.com/soya-events
    secret: ${WEBHOOK_SECRET}
    kinds: [run_completed, capability_violation]   # 過濾;預設全發
    delivery: at_least_once
```

`at_least_once` 意味著會出現重複——按 `(run_id, kind, ts)` 去重。

### 長訂閱

```bash
soyaos scope tail --tenant acme --filter 'kind == "run_completed"' --since 5m
```

排障級 tail。「剛才跑了什麼、為什麼」時用。先打 Moon 的環形緩衝(每租戶最近約 1 萬條事件),再串流收新事件。

## SoyaScope——UI

`SoyaScope` 是本地 web UI,把 Scope 事件流視覺化。在 `solo` 裡就是 `http://127.0.0.1:7474/` 落地頁。按 `run_id` 分組、展示階段時間軸、能力越界標紅、可以從任意事件之後重播執行。

## 簽名與完整性

每條 Scope 事件裡的 Ed25519 簽名用的是**單次執行 Key**,不是 Comet 的長期 Key。鏈路:

1. Moon 接受執行時簽發一對新簽名金鑰。
2. Comet 透過它的認證 WebSocket 收到私鑰。
3. Comet 發每條 Scope 事件前簽名。
4. Moon 把公鑰跟執行記錄存在一起;下游訂閱者用它驗簽。

把 Scope 事件接進外部 SIEM 時,可以用 Moon 的單次執行公鑰驗每條事件的 `sig`——從「Comet 發出」到「落進稽核日誌」全鏈路可追溯。

## 保留期

Moon 預設保留:

- **熱環形緩衝**——每租戶最近 1 萬條。記憶體,亞毫秒級讀。
- **溫冷儲存**——30 天,跟 SoyaPack 倉庫共用同一 S3 相容儲存桶。按 `run_id` 可查。
- **冷封存**——超過 30 天,只有租戶設了 `archive: true` 才存。按月 gzip。

`ent-private` 部署自行設定保留策略;上面是 `cloud` / `ent-cloud` 的預設。

每條事件在一次請求中扮演的角色見[架構](../getting-started/architecture.md#一次實際的事件軌跡);SSE 線協議見 [HTTP API](../reference/http-api.md)。
