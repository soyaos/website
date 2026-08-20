---
title: Scope 事件与可观测性
description: 每次 SoyaOS 运行都会发出的事件流，以及怎么消费它们。
order: 3
category: concepts
---

SoyaOS 里每次 Agent 运行都会发出一串 **Scope 事件**——按顺序追加的 JSON 行，详细到足以排障、审计、回放。Scope 也是实时进度 UI、审计日志、外接 webhook 背后的底座。

## envelope

每条 Scope 事件都共享这个 envelope：

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

- `kind` ——判别器。决定额外字段有哪些。
- `run_id` ——ULID。一次运行内贯穿整条事件流。
- `ts` ——RFC 3339，毫秒精度，永远 UTC。
- `pack` ——按实际解析的版本写的完整包引用。
- `tenant` ——Moon 租户 ID；多租户日志聚合时有用。
- `comet` ——发出该事件的 Comet 实例。
- `sig` ——对该事件规范 JSON（去掉 `sig` 本身）的 Ed25519 签名，由 Comet 的运行 Key 签出。下游可验证事件没被篡改。

## 事件类型

健康的运行里大致按这个顺序出现：

| Kind                      | 何时发出                                                  | 关键额外字段                               |
| ------------------------- | --------------------------------------------------------- | ------------------------------------------ |
| `run_started`             | Comet 接受一次运行。                                       | `inputs_hash`, `cache_mode`                |
| `stage_started`           | 一个 prompt / tool 阶段开始。                              | `stage`                                    |
| `tool_called`             | 调用了一个声明过的工具。                                   | `tool`, `args`, `tool_id`                  |
| `tool_completed`          | 工具返回。                                                 | `tool_id`, `ok`, `duration_ms`             |
| `llm_request`             | 向上游 LLM 发出请求。                                      | `upstream`, `model`, `prompt_tokens`       |
| `llm_response`            | 上游响应完整接收。                                         | `upstream`, `completion_tokens`            |
| `artifact_written`        | Agent 在 `/workdir/out` 写了一个产物。                     | `name`, `schema`, `size_bytes`             |
| `stage_completed`         | 阶段正常退出。                                             | `stage`, `artifacts`                       |
| `capability_violation`    | 沙箱或能力检查失败。                                       | `surface`, `requested`, `matched`          |
| `error`                   | 未捕获异常，或工具非零退出。                               | `stage`, `message`, `code`                 |
| `run_completed`           | 终结事件。**永远**恰好发一次。                              | `ok`, `total_ms`, `artifacts`, `cost`      |

`run_completed` 即使在失败时（`ok: false`）也会发。把它当「流结束」的订阅者永远不会挂死。

## 消费方式

### CLI 里

```bash
soyaos --json run hello --input @hello.json | jq -c .
```

管道接 `jq`、`vector`、任意行式工具。输出是换行分隔的 JSON（"NDJSON"）。

### OpenAI 兼容客户端

`/v1/chat/completions` 端点在 `stream: true` 时按 SSE 流式返回。`data:` 帧是 OpenAI 形状（`choices[0].delta.content`）；Scope 事件在并行的 `x-soya-scope:` SSE 通道里同步发，需要的客户端可以一起订。

### Webhook

Moon 可以配置成把一批 Scope 事件 POST 到 webhook URL：

```yaml
# moon.config.yaml（片段）
webhooks:
  - url: https://your-app.example.com/soya-events
    secret: ${WEBHOOK_SECRET}
    kinds: [run_completed, capability_violation]   # 过滤；默认全发
    delivery: at_least_once
```

`at_least_once` 意味着会出现重复——按 `(run_id, kind, ts)` 去重。

### 长订阅

```bash
soyaos scope tail --tenant acme --filter 'kind == "run_completed"' --since 5m
```

排障级 tail。「刚才跑了什么、为什么」时用。先打 Moon 的环形缓冲（每租户最近约 1 万条事件），再流式收新事件。

## SoyaScope——UI

`SoyaScope` 是本地 web UI，把 Scope 事件流可视化。在 `solo` 里就是 `http://127.0.0.1:7474/` 落地页。按 `run_id` 分组、展示阶段时间线、能力越界标红、可以从任意事件之后回放运行。

## 签名与完整性

每条 Scope 事件里的 Ed25519 签名用的是**单次运行 Key**，不是 Comet 的长期 Key。链路：

1. Moon 接受运行时签发一对新签名密钥。
2. Comet 通过它的认证 WebSocket 收到私钥。
3. Comet 发每条 Scope 事件前签名。
4. Moon 把公钥跟运行记录存在一起；下游订阅者用它验签。

把 Scope 事件接进外部 SIEM 时，可以用 Moon 的单次运行公钥验每条事件的 `sig`——从「Comet 发出」到「落进审计日志」全链路可追溯。

## 保留期

Moon 默认保留：

- **热环形缓冲**——每租户最近 1 万条。内存，亚毫秒级读。
- **温冷存储**——30 天，跟 SoyaPack 仓库共用同一 S3 兼容桶。按 `run_id` 可查。
- **冷归档**——超过 30 天，只有租户设了 `archive: true` 才存。按月 gzip。

`ent-private` 部署自己配保留策略；上面是 `cloud` / `ent-cloud` 的默认。

每条事件在一次请求中扮演的角色见[架构](../getting-started/architecture.md#一次实际的事件轨迹)；SSE 线协议见 [HTTP API](../reference/http-api.md)。
