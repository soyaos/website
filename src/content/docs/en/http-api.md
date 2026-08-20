---
title: HTTP API
description: The wire format SoyaOS speaks — OpenAI-compatible chat completions plus the Scope event channel.
order: 3
category: reference
---

A Moon exposes one HTTP surface that's deliberately small and OpenAI-shaped: clients that already speak `/v1/chat/completions` work without code changes. The Scope event stream rides alongside on a parallel channel for clients that want it.

Everything below is stable within v0; new endpoints will be **added**, never re-shaped.

## Base URL

```
https://moon.example.com/v1
```

For `solo` (laptop) deployments: `http://127.0.0.1:7474/v1`.

## Authentication

`Authorization: Bearer <api_key>`. Mint keys with `soyaos auth keys create`.

Solo: no auth required. The Moon refuses any non-loopback bind on `solo` to keep this honest.

## `POST /v1/chat/completions`

OpenAI-compatible chat completions. The body shape matches OpenAI almost exactly; SoyaOS-specific extensions live under `soya:` prefixed fields and are silently ignored by upstream-compatible clients.

### Request

```json
{
  "model": "soya:compo",
  "messages": [
    { "role": "user", "content": "outline an essay about X" }
  ],
  "stream": true,
  "soya": {
    "input": { "topic": "X", "tone": "academic" },
    "pin_version": "1.4.0",
    "cache_mode": "rw"
  }
}
```

| Field             | Required | Notes                                                                 |
| ----------------- | -------- | --------------------------------------------------------------------- |
| `model`           | yes      | `soya:<name>[@<version>]` or a pass-through name (`claude-…`, `gpt-…`).|
| `messages`        | yes      | Standard OpenAI shape. The last `user` message is the canonical input. |
| `stream`          | no       | Default `false`. Server-Sent Events when `true`.                      |
| `temperature`     | no       | Passed through to the upstream LLM if `model` is a pass-through.       |
| `soya.input`      | no       | Typed input matching the SoyaPack's `inputs` schema. If present, takes precedence over `messages`. |
| `soya.pin_version`| no       | Pin to a specific SoyaPack version (overrides `@version` in `model`).  |
| `soya.cache_mode` | no       | `off` / `read` / `write` / `rw`. Default `rw`.                         |

### Response (non-streaming)

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

The `content` is the Agent's final artifact JSON — same thing you'd see at the bottom of `soyaos run`. Clients that just want plain text can configure the Agent to emit a string artifact.

### Response (streaming, `stream: true`)

Server-Sent Events, two channels multiplexed by `event:`:

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

Clients that only know OpenAI ignore `event: scope` lines and see a normal OpenAI stream. Clients that want observability subscribe to both — every Scope event listed in [Scope events](../concepts/scope-events.md#event-kinds) appears here as it happens.

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

OpenAI-shaped; the `soya:` extension fields are extra. Pass-through model names appear here if the Moon is configured to advertise them.

## `GET /v1/runs/{run_id}`

Fetch the metadata for a completed run.

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

Replay the Scope event stream for a finished run, as NDJSON:

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

Use this for "what really happened on run X" investigation. The same events that streamed live are replayable later.

## `POST /v1/packs` (push)

Used by `soyaos pack push`. Multipart body containing the canonicalized bundle plus the `.soya/signature.json`. The Moon verifies the signature, allocates an immutable version slot, returns:

```json
{
  "pack":          "soya:research-summarizer@0.1.0",
  "bundle_sha256": "8d2c…",
  "signed_by":     "chzealot-2026",
  "status":        "published"
}
```

See [Sign and publish a SoyaPack](../guides/sign-and-publish.md) for the full flow.

## Error envelope

All errors share this shape:

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

Top-level HTTP status:

| Status | Meaning                                              |
| ------ | ---------------------------------------------------- |
| `200`  | Success.                                             |
| `400`  | Malformed request body or invalid input schema.      |
| `401`  | Missing / invalid API key.                           |
| `403`  | Authenticated but lacking permission (e.g. capability_violation). |
| `404`  | Unknown pack / run / model name.                     |
| `410`  | Pack version is deprecated.                          |
| `429`  | Rate-limited (per-key or per-pack).                  |
| `500`  | Internal Moon error.                                 |
| `502`  | Upstream LLM error (the body's `error.upstream` is the verbatim upstream payload). |

## Rate limits

Per API key: 60 requests/minute by default; bumpable by an admin. Per pack: configurable via the SoyaPack's `sla:` block (v1).

## Webhooks

Configure via `moon.config.yaml` (see [Self-host a Moon on a VPS](../guides/self-host-moon.md)). Payload is a JSON array of Scope events, signed by the Moon with HMAC-SHA256 over the body:

```
X-Soya-Signature: sha256=…
```

Verify with the per-tenant webhook secret.

## OpenAPI

The full schema is served at `/v1/openapi.json` (auth-gated). Build SDK code from it the standard way:

```bash
curl -H "Authorization: Bearer $KEY" https://moon.example.com/v1/openapi.json > soya.json
openapi-generator-cli generate -i soya.json -g typescript-fetch -o ./client
```
