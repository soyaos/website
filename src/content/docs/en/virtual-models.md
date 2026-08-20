---
title: Virtual models & BYOK
description: How soya:* model IDs resolve and how to bring your own LLM keys.
order: 2
category: concepts
---

SoyaOS speaks OpenAI on the way in *and* on the way out. The way that's possible without locking you into our hosted infra is **virtual model IDs** — names that start with `soya:` and resolve to a SoyaPack at the Moon, plus **BYOK** routing that lets you drop in your own upstream LLM key whenever you want.

## What `soya:*` is

A virtual model ID is the name your client uses to call an Agent:

```bash
curl http://moon.example.com/v1/chat/completions \
  -d '{
    "model": "soya:compo",
    "messages": [{"role": "user", "content": "outline an essay about X"}]
  }'
```

The Moon resolves `soya:compo` through this lookup chain at request time:

```
soya:compo                                    # what the client sends
  → soya:compo@*  in the registry             # latest published version
  → soya:compo@1.4.0                          # concrete version pinned for this tenant
  → SoyaPack manifest                         # the actual code that runs
  → Comet                                     # the worker that materializes it
```

You can pin a specific version client-side too:

```json
{ "model": "soya:compo@1.4.0", "messages": [...] }
```

## Why decouple the model name from the LLM

Three reasons:

1. **One name, many implementations.** `soya:compo` can be backed by Claude one quarter and a fine-tuned Qwen the next. The client doesn't have to know.
2. **Composition.** An Agent can call other Agents by name — `soya:reviewer` invoking `soya:fact-checker` mid-stream — and the upstream LLM is an implementation detail of each.
3. **BYOK without surgery.** When you swap your model key, every `soya:*` model on the Moon picks up the change at once. You don't update 27 client config files.

## BYOK — bring your own LLM key

A Moon can be configured with one or more **upstream model profiles**. Each profile is "where do I send requests for vendor X":

```yaml
# moon.config.yaml (excerpt)
upstreams:
  claude:
    kind: anthropic
    base_url: https://api.anthropic.com
    api_key: ${ANTHROPIC_API_KEY}
  openai:
    kind: openai
    base_url: https://api.openai.com
    api_key: ${OPENAI_API_KEY}
  qwen-local:
    kind: openai-compat
    base_url: http://192.168.1.10:11434/v1   # Ollama on the LAN
    api_key: ollama
```

A SoyaPack declares which upstream it wants:

```yaml
# soyapack.yaml (excerpt)
upstream:
  prefer: claude
  fallback: openai
```

At run time the Comet looks up `prefer: claude` in the Moon's `upstreams:`, signs the call with that profile's key, and proceeds. Falling back is automatic on `5xx` from the prefer target.

When you "stop paying us for inference", what you're doing is moving from a Moon-provided profile (where we hold the key) to one of your own profiles — usually `openai` with your own org's key, or a local Ollama for fully air-gapped runs.

## Reserved names

`soya:` is the only reserved prefix; everything else (`gpt-*`, `claude-*`, `qwen-*`) is treated as a **pass-through** name. If a client sends `model: "claude-sonnet-4-6"` directly, the Moon routes it as a transparent proxy through whichever upstream profile is named `claude` (or refuses the request if there's no such profile). This is the "Moon as a transparent LLM provider" mode.

## Cost & metering

When a `soya:*` model resolves to a SoyaPack that calls an upstream, you see two cost lines on the Moon's metering page:

| Line                    | Where the money goes               |
| ----------------------- | ---------------------------------- |
| **Upstream tokens**     | Anthropic / OpenAI / your provider |
| **Comet seconds**       | SoyaOS, Inc. (cloud editions only) |

If you BYOK, the upstream line is zero on the Moon's invoice (because you're paying Anthropic directly). The Comet line stays — that's the compute we actually scheduled for you.

## Common patterns

**Region pinning.** Define `claude-us` and `claude-eu` as separate upstream profiles in the Moon config; SoyaPacks declare `prefer: claude-us` or read the user's region from input. Same `soya:*` name, different physical destination.

**Local-first development.** Run a local Ollama, configure a `local` upstream pointing at it, and SoyaPacks with `prefer: local, fallback: claude` work both offline (Ollama) and in production (Claude) without code changes.

**Cost guardrails.** A Moon-level cost limit per upstream profile means a runaway Agent can't burn through your annual budget in an afternoon. Configure under `upstreams.<name>.budget:` in the Moon config.

See [SoyaPack v0 manifest](../reference/soyapack-v0.md) for the manifest schema and [HTTP API](../reference/http-api.md) for the wire format.
