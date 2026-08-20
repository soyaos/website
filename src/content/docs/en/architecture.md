---
title: Architecture
description: Planet, Moon, and Comet — the three node roles that compose every SoyaOS deployment.
order: 2
category: getting-started
---

SoyaOS is one binary that can play three roles. A deployment is just a particular shape of those roles. Whether you run `solo` on a laptop or `enterprise-private` in a sealed datacenter, the role boundary and the protocol between roles never changes — only the topology does.

## The three node roles

### Comet

A **Comet** is an ephemeral worker. It runs a single Agent invocation, streams its output, and exits. Comets are stateless — they pull the SoyaPack bundle from a Moon, mount a sandboxed `/workdir`, and emit Scope events as they progress.

> Mental model: a Comet is a fast, opinionated `kubectl exec` for one Agent run.

Concretely a Comet:

- Subscribes to a Moon for work over an outbound HTTPS WebSocket.
- Materializes the SoyaPack into a temporary directory, verifies its signature, and refuses to run if the capability allowlist isn't satisfiable on this host.
- Streams stdout and Scope events back through the same WebSocket.
- Self-terminates after `idle_timeout` (default 300s) or `max_runs` (default unlimited).

### Moon

A **Moon** is a per-tenant control surface. It hosts the API surface that developers and users talk to, holds the SoyaPack registry, mints API keys, and brokers Scope events. A Moon does **not** run Agents itself; it dispatches to Comets.

> Mental model: a Moon is the "team workspace". One per company / studio / household.

Inside a Moon:

- The OpenAI-compatible endpoint (`/v1/chat/completions`) — takes a `model: "soya:*"` request, resolves it to a SoyaPack version, picks a Comet, returns a streaming response.
- The SoyaPack registry — versioned, content-addressed bundles backed by S3-compatible object storage.
- The auth surface — issues API keys and capability tokens; verifies signed packs on push.
- The Scope broker — multiplexes per-run events to subscribers (Studio, Developer Portal, webhooks).

### Planet

A **Planet** is the federation root. It owns identity (who you are), billing (when there is billing), and cross-Moon routing. In `solo` deployments there is no separate Planet — Planet, Moon and Comet collapse into one process.

> Mental model: a Planet is the "constellation operator". Optional for single-tenant deployments.

A Planet's responsibilities:

- **Identity** — OIDC issuer for users and Moons; signs SSO assertions.
- **Routing** — maps a tenant URL (`tenant.moon.example.com`) to a specific Moon.
- **Cross-Moon contracts** — the only entity that can authorize a SoyaPack to run on a Moon outside its origin tenant.

## How a request flows

<figure class="not-prose my-8">
<svg viewBox="0 0 760 620" role="img" aria-labelledby="archflow-title archflow-desc" xmlns="http://www.w3.org/2000/svg" class="w-full max-w-3xl mx-auto block">
  <title id="archflow-title">SoyaOS request flow</title>
  <desc id="archflow-desc">A client SDK calls a Moon over OpenAI-compatible HTTPS. The Moon resolves the tenant URL via the Planet (federation root, optional in solo), picks a warm Comet, which calls the upstream LLM. Scope events flow back through the Moon WebSocket to subscribers like Studio, the Developer Portal, and webhooks.</desc>
  <defs>
    <marker id="archflow-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="#a6781c"></path>
    </marker>
  </defs>
  <rect x="0" y="0" width="760" height="620" rx="16" fill="#f8f5ec" stroke="#2b2419" stroke-opacity="0.08"></rect>
  <g>
    <rect x="290" y="30" width="180" height="80" rx="12" fill="#ffffff" stroke="#2b2419" stroke-opacity="0.18"></rect>
    <text x="380" y="60" text-anchor="middle" font-weight="600" font-size="16" fill="#2b2419">Planet</text>
    <text x="380" y="86" text-anchor="middle" font-size="12" fill="#6b6051">identity · routing · billing</text>
    <text x="488" y="58" font-size="11" fill="#a6781c" font-style="italic">federation root</text>
    <text x="488" y="74" font-size="11" fill="#a6781c" font-style="italic">optional in solo</text>
  </g>
  <g>
    <line x1="380" y1="110" x2="380" y2="167" stroke="#a6781c" stroke-width="1.5" marker-end="url(#archflow-arrow)"></line>
    <text x="392" y="142" font-size="11" fill="#6b6051">resolves tenant URL</text>
  </g>
  <g>
    <rect x="260" y="170" width="240" height="130" rx="12" fill="#ffffff" stroke="#2b2419" stroke-opacity="0.18"></rect>
    <text x="380" y="200" text-anchor="middle" font-weight="600" font-size="16" fill="#2b2419">Moon</text>
    <text x="380" y="226" text-anchor="middle" font-size="12" fill="#6b6051">/v1/chat/completions</text>
    <text x="380" y="248" text-anchor="middle" font-size="12" fill="#6b6051">SoyaPack registry</text>
    <text x="380" y="270" text-anchor="middle" font-size="12" fill="#6b6051">Scope broker</text>
  </g>
  <g>
    <text x="30" y="220" font-size="12" font-weight="600" fill="#2b2419">Client SDK</text>
    <text x="30" y="238" font-size="11" fill="#6b6051">OpenAI-compatible · HTTPS</text>
    <line x1="148" y1="232" x2="257" y2="232" stroke="#a6781c" stroke-width="1.5" marker-end="url(#archflow-arrow)"></line>
  </g>
  <g>
    <polyline points="380,300 380,338 290,338 290,377" fill="none" stroke="#a6781c" stroke-width="1.5" marker-end="url(#archflow-arrow)"></polyline>
    <text x="298" y="332" font-size="11" fill="#6b6051">pick a warm Comet (or cold-start)</text>
  </g>
  <g>
    <rect x="180" y="380" width="220" height="100" rx="12" fill="#ffffff" stroke="#2b2419" stroke-opacity="0.18"></rect>
    <text x="290" y="410" text-anchor="middle" font-weight="600" font-size="16" fill="#2b2419">Comet</text>
    <text x="290" y="434" text-anchor="middle" font-size="12" fill="#6b6051">sandboxed /workdir</text>
    <text x="290" y="456" text-anchor="middle" font-size="12" fill="#6b6051">capability allowlist</text>
  </g>
  <g>
    <rect x="440" y="380" width="220" height="100" rx="12" fill="#ffffff" stroke="#2b2419" stroke-opacity="0.18"></rect>
    <text x="550" y="410" text-anchor="middle" font-weight="600" font-size="16" fill="#2b2419">upstream LLM</text>
    <text x="550" y="434" text-anchor="middle" font-size="12" fill="#6b6051">Claude · GPT</text>
    <text x="550" y="456" text-anchor="middle" font-size="12" fill="#6b6051">Qwen · Ollama</text>
  </g>
  <g>
    <line x1="403" y1="430" x2="437" y2="430" stroke="#a6781c" stroke-width="1.5" marker-start="url(#archflow-arrow)" marker-end="url(#archflow-arrow)"></line>
  </g>
  <g>
    <line x1="290" y1="482" x2="290" y2="540" stroke="#a6781c" stroke-width="1.5" stroke-dasharray="4 3" marker-end="url(#archflow-arrow)"></line>
    <text x="302" y="512" font-size="11" fill="#6b6051">Scope events · back through Moon WebSocket</text>
  </g>
  <text x="290" y="572" text-anchor="middle" font-size="13" fill="#2b2419" font-weight="500">Studio · Developer Portal · webhooks</text>
</svg>
<figcaption class="mt-2 text-center text-[12px] italic text-soya-mute">How a SoyaOS request flows.</figcaption>
</figure>

1. Client calls the OpenAI-compatible endpoint on a Moon: `POST /v1/chat/completions` with `model: "soya:compo"`.
2. The Moon resolves `soya:compo` → a specific SoyaPack version (e.g. `soya:compo@1.4.0`) and picks a warm Comet (or cold-starts one).
3. The Comet executes the Agent inside its sandbox, calling out to upstream LLMs via the capability allowlist, and streams Scope events back through the Moon.
4. The Moon multiplexes those events to subscribers (Studio, Developer Portal, webhooks).
5. When the Agent completes, the Comet emits a final artifact JSON and self-terminates (or returns to the warm pool, depending on `idle_timeout`).

## A concrete event trace

For a single `soya:compo` invocation, the Scope event stream looks roughly like:

```
00.000 run_started        run_id=run_018f… pack=soya:compo@1.4.0 comet=cmt-a3
00.012 stage_started      stage=outline
00.087 tool_called        tool=fetch_reference  args={url:…}        # capability check: egress.host
00.412 tool_completed     tool=fetch_reference  ok=true
00.514 llm_request        upstream=claude-sonnet-4-6  prompt_tokens=1842
01.823 llm_response       completion_tokens=612
01.834 stage_completed    stage=outline  artifacts=[outline.v1]
01.835 stage_started      stage=writer
…
04.219 run_completed      ok=true  artifacts=[outline.v1, guide.v1]
```

Every event is JSON, every event has the same envelope (`run_id`, `ts`, `kind`), and every event is signed by the Comet's run key — see [Scope events & observability](./scope-events.md).

## Why this split?

- **Scaling shape**: Comets are cattle, Moons are pets, Planets are almost-pets. You can run a million Comets behind one Moon. A Moon scales vertically until ~10k concurrent runs; past that, shard tenants across Moons.
- **Security**: every Agent runs inside a Comet's capability allowlist; the Moon never executes user code. A compromised Comet cannot reach the Moon's secrets — the Comet only ever sees its own short-lived run key.
- **Federation**: many Moons can hang off one Planet, or roll up to many Planets in `enterprise-cloud` deployments. A Planet can fail without taking Moons offline — Moons cache their identity certs and continue serving until the cert expires.

## Mapping roles to editions

| Edition         | Where Comet runs   | Where Moon runs       | Where Planet runs     |
| --------------- | ------------------ | --------------------- | --------------------- |
| `solo`          | in-process         | in-process            | n/a (collapsed)       |
| `cluster`       | your LAN / VPC     | your VPS              | n/a or your VPS       |
| `cloud`         | soyaos.ai          | soyaos.ai             | soyaos.ai             |
| `hybrid`        | your VPC           | soyaos.ai             | soyaos.ai             |
| `ent-cloud`     | soyaos.ai (dedicated) | soyaos.ai (dedicated) | soyaos.ai (region-pinned) |
| `ent-private`   | customer-operated  | customer-operated     | customer-operated     |

See [Editions](./editions.md) for the full matrix; see [Capabilities & sandbox](./capabilities-sandbox.md) for what a Comet can and cannot do.
