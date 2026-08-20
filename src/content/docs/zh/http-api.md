---
title: HTTP API
description: SoyaOS 的线协议——OpenAI 兼容的 chat completions 加 Scope 事件通道。
order: 3
category: reference
---

Moon 暴露一个故意小、形状对齐 OpenAI 的 HTTP 表面：已经讲 `/v1/chat/completions` 的客户端不改一行代码就能用。Scope 事件流在一条并行通道里同步发，需要的客户端可以一起订。

下面所有都在 v0 内稳定；新端点只**新增**、绝不改形状。

## Base URL

```
https://moon.example.com/v1
```

`solo`（笔记本）部署：`http://127.0.0.1:7474/v1`。

## 鉴权

`Authorization: Bearer <api_key>`。用 `soyaos auth keys create` 签发。

Solo 不需要鉴权。`solo` 上 Moon 拒绝任何非 loopback 绑定，保证这一点不被破坏。

## `POST /v1/chat/completions`

OpenAI 兼容的 chat completions。请求体形状几乎和 OpenAI 一样；SoyaOS 特有字段放在 `soya:` 前缀下，OpenAI 客户端会静默忽略。

### 请求

```json
{
  "model": "soya:compo",
  "messages": [
    { "role": "user", "content": "给一篇关于 X 的文章列大纲" }
  ],
  "stream": true,
  "soya": {
    "input": { "topic": "X", "tone": "academic" },
    "pin_version": "1.4.0",
    "cache_mode": "rw"
  }
}
```

| 字段                | 必填  | 说明                                                                       |
| ------------------- | ----- | -------------------------------------------------------------------------- |
| `model`             | 是    | `soya:<name>[@<version>]`，或透传名（`claude-…`、`gpt-…`）。               |
| `messages`          | 是    | 标准 OpenAI 形状。最后一条 `user` 消息是规范输入。                          |
| `stream`            | 否    | 默认 `false`。`true` 时走 SSE。                                            |
| `temperature`       | 否    | `model` 是透传名时透传给上游 LLM。                                          |
| `soya.input`        | 否    | 匹配 SoyaPack `inputs` schema 的类型化输入。存在时优先级高于 `messages`。   |
| `soya.pin_version`  | 否    | pin 到具体 SoyaPack 版本（覆盖 `model` 里的 `@version`）。                  |
| `soya.cache_mode`   | 否    | `off` / `read` / `write` / `rw`。默认 `rw`。                                |

### 响应（非流式）

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

`content` 就是 Agent 的最终产物 JSON——跟 `soyaos run` 最后一行看到的是同一个东西。只想要纯文本的客户端可以把 Agent 配置成产出字符串产物。

### 响应（流式，`stream: true`）

SSE，两个通道用 `event:` 多路复用：

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

只懂 OpenAI 的客户端会忽略 `event: scope` 行，看到的就是普通 OpenAI 流。想要可观测性的客户端两个一起订——[Scope 事件](../concepts/scope-events.md#事件类型)里列出的每条都会实时出现在这里。

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

OpenAI 形状；`soya:` 扩展字段是额外的。如果 Moon 配置了透传模型名，也会出现在这里。

## `GET /v1/runs/{run_id}`

拿一次已完成运行的元数据。

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

按 NDJSON 回放一次完成运行的 Scope 事件流：

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

用来排查「运行 X 到底发生了什么」。当时流式发的事件，事后能完整回放。

## `POST /v1/packs`（push）

`soyaos pack push` 用的端点。Multipart 体含规范化 bundle + `.soya/signature.json`。Moon 验签、分配不可变版本槽位、返回：

```json
{
  "pack":          "soya:research-summarizer@0.1.0",
  "bundle_sha256": "8d2c…",
  "signed_by":     "chzealot-2026",
  "status":        "published"
}
```

完整流程见[签名与发布 SoyaPack](../guides/sign-and-publish.md)。

## 错误 envelope

所有错误共享这个形状：

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

顶层 HTTP 状态：

| 状态   | 含义                                                 |
| ------ | ---------------------------------------------------- |
| `200`  | 成功。                                               |
| `400`  | 请求体格式错或输入 schema 不通过。                    |
| `401`  | API Key 缺失 / 无效。                                 |
| `403`  | 已认证但权限不足（例如 capability_violation）。       |
| `404`  | 未知 pack / run / model 名。                          |
| `410`  | 包版本已弃用。                                        |
| `429`  | 限流（按 Key 或按 pack）。                            |
| `500`  | Moon 内部错。                                         |
| `502`  | 上游 LLM 错（body 里 `error.upstream` 是上游原文）。  |

## 限流

每个 API Key：默认 60 次/分钟；管理员可上调。每个 pack：通过 SoyaPack 的 `sla:` 块配（v1）。

## Webhook

在 `moon.config.yaml` 里配（见[自托管 Moon](../guides/self-host-moon.md)）。Payload 是 JSON 数组的 Scope 事件，Moon 用 HMAC-SHA256 对 body 签名：

```
X-Soya-Signature: sha256=…
```

用每租户的 webhook secret 验。

## OpenAPI

完整 schema 在 `/v1/openapi.json` 暴露（鉴权后）。按标准方式生 SDK：

```bash
curl -H "Authorization: Bearer $KEY" https://moon.example.com/v1/openapi.json > soya.json
openapi-generator-cli generate -i soya.json -g typescript-fetch -o ./client
```
