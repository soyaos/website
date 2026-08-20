---
title: HTTP API
description: SoyaOS 的線協議——OpenAI 相容的 chat completions 加 Scope 事件通道。
order: 3
category: reference
---

Moon 暴露一個故意小、形狀對齊 OpenAI 的 HTTP 表面:已經講 `/v1/chat/completions` 的客戶端不改一行程式碼就能用。Scope 事件流在一條並行通道裡同步發,需要的客戶端可以一起訂。

下面所有都在 v0 內穩定;新端點只**新增**、絕不改形狀。

## Base URL

```
https://moon.example.com/v1
```

`solo`(筆電)部署:`http://127.0.0.1:7474/v1`。

## 鑑權

`Authorization: Bearer <api_key>`。用 `soyaos auth keys create` 簽發。

Solo 不需要鑑權。`solo` 上 Moon 拒絕任何非 loopback 綁定,保證這一點不被破壞。

## `POST /v1/chat/completions`

OpenAI 相容的 chat completions。請求體形狀幾乎和 OpenAI 一樣;SoyaOS 特有欄位放在 `soya:` 前綴下,OpenAI 客戶端會靜默忽略。

### 請求

```json
{
  "model": "soya:compo",
  "messages": [
    { "role": "user", "content": "給一篇關於 X 的文章列大綱" }
  ],
  "stream": true,
  "soya": {
    "input": { "topic": "X", "tone": "academic" },
    "pin_version": "1.4.0",
    "cache_mode": "rw"
  }
}
```

| 欄位                | 必填  | 說明                                                                       |
| ------------------- | ----- | -------------------------------------------------------------------------- |
| `model`             | 是    | `soya:<name>[@<version>]`,或透傳名(`claude-…`、`gpt-…`)。                 |
| `messages`          | 是    | 標準 OpenAI 形狀。最後一條 `user` 訊息是規範輸入。                          |
| `stream`            | 否    | 預設 `false`。`true` 時走 SSE。                                            |
| `temperature`       | 否    | `model` 是透傳名時透傳給上游 LLM。                                          |
| `soya.input`        | 否    | 比對 SoyaPack `inputs` schema 的型別化輸入。存在時優先級高於 `messages`。   |
| `soya.pin_version`  | 否    | pin 到具體 SoyaPack 版本(覆蓋 `model` 裡的 `@version`)。                    |
| `soya.cache_mode`   | 否    | `off` / `read` / `write` / `rw`。預設 `rw`。                                |

### 回應(非串流)

```json
{
  "id": "run_018f3a4b1c2d3e4f",
  "object": "chat.completion",
  "created": 1715670703,
  "model": "soya:compo@1.4.0",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "{ \"summary\": { ... } }"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": { "prompt_tokens": 1842, "completion_tokens": 612, "total_tokens": 2454 }
}
```

`content` 就是 Agent 的最終產物 JSON——跟 `soyaos run` 最後一列看到的是同一個東西。只想要純文本的客戶端可以把 Agent 設定成產出字串產物。

### 回應(串流,`stream: true`)

SSE,兩個通道用 `event:` 多工:

```
event: message
data: { "id":"…","choices":[{"delta":{"content":"…"}}] }

event: scope
data: { "kind":"stage_started","run_id":"…","stage":"outline","ts":"…" }

event: scope
data: { "kind":"tool_called","run_id":"…","tool":"fetch","args":{…},"ts":"…" }

event: message
data: { "id":"…","choices":[{"delta":{"content":"…"}}] }

event: done
data: [DONE]
```

只懂 OpenAI 的客戶端會忽略 `event: scope` 列,看到的就是普通 OpenAI 串流。想要可觀測性的客戶端兩個一起訂——[Scope 事件](../concepts/scope-events.md#事件類型)裡列出的每條都會即時出現在這裡。

## `GET /v1/models`

```json
{
  "object": "list",
  "data": [
    { "id": "soya:compo",       "object": "model", "owned_by": "soya", "soya": { "kind": "Agent", "version": "1.4.0" } },
    { "id": "soya:newsbeam",    "object": "model", "owned_by": "soya", "soya": { "kind": "Agent", "version": "0.7.2" } },
    { "id": "claude-sonnet-4-6","object": "model", "owned_by": "anthropic" }
  ]
}
```

OpenAI 形狀;`soya:` 擴充欄位是額外的。如果 Moon 設定了透傳模型名,也會出現在這裡。

## `GET /v1/runs/{run_id}`

拿一次已完成執行的後設資料。

```json
{
  "run_id":   "run_018f3a4b1c2d3e4f",
  "pack":     "soya:compo@1.4.0",
  "tenant":   "acme",
  "started":  "2026-05-14T08:11:43.512Z",
  "completed":"2026-05-14T08:11:48.731Z",
  "ok":       true,
  "artifacts":[
    { "name": "outline", "schema": "outline.v1", "url": "https://…/outline.json" },
    { "name": "guide",   "schema": "guide.v1",   "url": "https://…/guide.json" }
  ],
  "cost": { "comet_seconds": 5.2, "upstream_tokens": 2454 }
}
```

## `GET /v1/runs/{run_id}/scope`

按 NDJSON 重播一次完成執行的 Scope 事件流:

```bash
curl -H "Authorization: Bearer $KEY" \
  https://moon.example.com/v1/runs/run_018f3a/scope | jq -c .
```

```
{"kind":"run_started","run_id":"run_018f3a4b1c2d3e4f","ts":"…"}
{"kind":"stage_started","run_id":"run_018f3a4b1c2d3e4f","stage":"outline","ts":"…"}
…
{"kind":"run_completed","run_id":"run_018f3a4b1c2d3e4f","ok":true,"ts":"…"}
```

用來排查「執行 X 到底發生了什麼」。當時串流發的事件,事後能完整重播。

## `POST /v1/packs`(push)

`soyaos pack push` 用的端點。Multipart body 含規範化 bundle + `.soya/signature.json`。Moon 驗簽、配置不可變版本槽位、回傳:

```json
{
  "pack":          "soya:research-summarizer@0.1.0",
  "bundle_sha256": "8d2c…",
  "signed_by":     "chzealot-2026",
  "status":        "published"
}
```

完整流程見[簽名與發布 SoyaPack](../guides/sign-and-publish.md)。

## 錯誤 envelope

所有錯誤共享這個形狀:

```json
{
  "error": {
    "type":    "capability_violation",
    "message": "egress to api.anthropic.com:443 not in allowlist",
    "code":    "EGRESS_NOT_ALLOWED",
    "run_id":  "run_018f3a4b1c2d3e4f"
  }
}
```

頂層 HTTP 狀態:

| 狀態   | 含義                                                 |
| ------ | ---------------------------------------------------- |
| `200`  | 成功。                                               |
| `400`  | 請求體格式錯或輸入 schema 不通過。                    |
| `401`  | API Key 缺失 / 無效。                                 |
| `403`  | 已認證但權限不足(例如 capability_violation)。         |
| `404`  | 未知 pack / run / model 名。                          |
| `410`  | 套件版本已棄用。                                      |
| `429`  | 限流(按 Key 或按 pack)。                              |
| `500`  | Moon 內部錯。                                         |
| `502`  | 上游 LLM 錯(body 裡 `error.upstream` 是上游原文)。    |

## 限流

每個 API Key:預設 60 次/分鐘;管理員可上調。每個 pack:透過 SoyaPack 的 `sla:` 區塊設定(v1)。

## Webhook

在 `moon.config.yaml` 裡設定(見[自管 Moon](../guides/self-host-moon.md))。Payload 是 JSON 陣列的 Scope 事件,Moon 用 HMAC-SHA256 對 body 簽名:

```
X-Soya-Signature: sha256=…
```

用每租戶的 webhook secret 驗。

## OpenAPI

完整 schema 在 `/v1/openapi.json` 暴露(鑑權後)。按標準方式生 SDK:

```bash
curl -H "Authorization: Bearer $KEY" https://moon.example.com/v1/openapi.json > soya.json
openapi-generator-cli generate -i soya.json -g typescript-fetch -o ./client
```
