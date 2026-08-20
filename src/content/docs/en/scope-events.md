---
title: Scope events & observability
description: The event stream every SoyaOS run emits, and how to consume it.
order: 3
category: concepts
---

Every Agent run in SoyaOS emits a stream of **Scope events** — append-only JSON lines describing what happened, in order, with enough detail to debug, audit, or replay the run. Scope is what powers the live progress UI, the audit log, and any webhook you wire up.

## The envelope

Every Scope event shares this envelope:

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

- `kind` — discriminator. Determines what extra fields are present.
- `run_id` — ULID. Stable across the full event stream for one run.
- `ts` — RFC 3339, millisecond precision, always UTC.
- `pack` — fully-qualified pack reference at the version actually resolved.
- `tenant` — Moon tenant ID; useful for multi-tenant log aggregation.
- `comet` — the Comet instance that emitted the event.
- `sig` — Ed25519 signature over the canonical JSON of the event (without the `sig` field itself), produced by the Comet's run key. Lets you verify the event wasn't tampered with downstream.

## Event kinds

The core kinds, in roughly the order they appear in a healthy run:

| Kind                      | Emitted when                                            | Key extra fields                           |
| ------------------------- | ------------------------------------------------------- | ------------------------------------------ |
| `run_started`             | A run is admitted by Comet.                             | `inputs_hash`, `cache_mode`                |
| `stage_started`           | A prompt/tool stage begins.                             | `stage`                                    |
| `tool_called`             | A declared tool is invoked.                             | `tool`, `args`, `tool_id`                  |
| `tool_completed`          | The tool returns.                                       | `tool_id`, `ok`, `duration_ms`             |
| `llm_request`             | A request is sent to an upstream LLM.                   | `upstream`, `model`, `prompt_tokens`       |
| `llm_response`            | The upstream response is fully received.                | `upstream`, `completion_tokens`            |
| `artifact_written`        | The Agent writes an artifact under `/workdir/out`.      | `name`, `schema`, `size_bytes`             |
| `stage_completed`         | The stage exits successfully.                           | `stage`, `artifacts`                       |
| `capability_violation`    | A sandbox or capability check fails.                    | `surface`, `requested`, `matched`          |
| `error`                   | An uncaught error or non-zero exit from a tool.         | `stage`, `message`, `code`                 |
| `run_completed`           | Terminal event. Always emitted exactly once.            | `ok`, `total_ms`, `artifacts`, `cost`      |

`run_completed` is **always** emitted, even on failure (`ok: false`). Subscribers that watch for it as the "end of stream" sentinel will never hang.

## Consuming events

### From the CLI

```bash
soyaos --json run hello --input @hello.json | jq -c .
```

Pipe to `jq`, `vector`, or any line-oriented tool. The output is newline-delimited JSON ("NDJSON").

### From an OpenAI-compatible client

The `/v1/chat/completions` endpoint streams events as Server-Sent Events when you set `stream: true`. The `data:` frames are OpenAI-shaped (`choices[0].delta.content`); Scope events ride alongside in a parallel `x-soya-scope:` SSE channel for clients that want them.

### From a webhook

Moons can be configured to POST a batch of Scope events to a webhook URL:

```yaml
# moon.config.yaml (excerpt)
webhooks:
  - url: https://your-app.example.com/soya-events
    secret: ${WEBHOOK_SECRET}
    kinds: [run_completed, capability_violation]   # filter; default = all
    delivery: at_least_once
```

`at_least_once` means duplicates are possible — dedupe by `(run_id, kind, ts)`.

### From a long-lived subscriber

```bash
soyaos scope tail --tenant acme --filter 'kind == "run_completed"' --since 5m
```

A diagnostic-grade tail. Useful for "what just ran and why" investigation. Reaches into the Moon's ring buffer (last ~10k events per tenant) and then streams new events as they arrive.

## SoyaScope — the UI

`SoyaScope` is the local web UI that visualizes Scope event streams. In `solo`, it's the page you land on at `http://127.0.0.1:7474/`. It groups events by `run_id`, shows the stage timeline, surfaces capability violations in red, and lets you replay a run from any event onward.

## Signing & integrity

The Ed25519 signature in every Scope event uses a **per-run key**, not a long-lived Comet key. The chain is:

1. The Moon mints a fresh signing keypair when admitting a run.
2. The Comet receives the private key over its authenticated WebSocket.
3. The Comet signs every Scope event before emitting.
4. The Moon stores the public key alongside the run record; downstream subscribers verify with that.

If you're piping Scope events into an external SIEM, you can verify each event's `sig` against the Moon's per-run public key — full chain of custody from "event emitted by the Comet" to "event landed in your audit log".

## Retention

By default a Moon keeps:

- **Hot ring buffer** — last 10k events per tenant. In-memory, sub-ms reads.
- **Warm cold storage** — 30 days, on the same S3-compatible bucket as the SoyaPack registry. Queryable by `run_id`.
- **Cold archive** — beyond 30 days, only if `archive: true` is set on the tenant. Gzipped, by month.

`ent-private` deployments configure retention themselves; the defaults above apply to `cloud` / `ent-cloud`.

See [Architecture](../getting-started/architecture.md#a-concrete-event-trace) for the role each event plays in a request, and [HTTP API](../reference/http-api.md) for the SSE wire format.
