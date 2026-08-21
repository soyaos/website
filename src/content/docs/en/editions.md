---
title: Editions
description: Six deployment shapes from one binary — Solo to Enterprise Private.
order: 4
category: getting-started
---

The SoyaOS *edition* describes where the control plane and workloads run and who operates them. Solo uses the local binary. Cloud v0.2.0 is a live hosted text-Agent service consumed through the Developer Portal and OpenAI-compatible API. The other editions remain roadmap items.

```bash
soyaos start --edition solo      # current local entry point
```

## The matrix

| Edition              | Control plane (Planet)             | Data plane (Comets)                 | Persona                                    | Typical cost                     | Status     |
| -------------------- | ---------------------------------- | ----------------------------------- | ------------------------------------------ | -------------------------------- | ---------- |
| `solo`               | in-process                         | in-process                          | One dev, one laptop                        | Free · your hardware             | alpha now  |
| `cluster`            | self-hosted Planet on your VPS     | self-hosted Comets in your LAN/VPC  | A team + VPS + intranet devices            | ~$0.10 / Comet·hr (est.)         | planned    |
| `cloud`              | hosted personal tenant and API keys| platform-reviewed hosted text Agent | Register, get an API key, ship             | currently free · daily quotas    | Stable v0.2.0 |
| `hybrid`             | soyaos.ai-managed Planet           | your Comets in your VPC / on-prem   | SaaS Planet, your Moon                     | per-token (control plane only)   | planned    |
| `ent-cloud`          | dedicated Planet (region pinned)   | dedicated Comet pool                | Multi-tenant SaaS with SSO and SLA         | contact us                       | planned    |
| `ent-private`        | customer-operated Planet           | customer-operated Comets            | On-prem or air-gapped                      | annual license                   | planned    |

> Each edition uses an **OpenAI-compatible API** as its primary call surface. Cloud v0.2.0 currently exposes platform-reviewed text Agents only; it does not accept or run user-supplied SoyaPacks. The complete Cloud architecture remains a roadmap.

## Decision tree

Pick the first row that matches: start with **cloud** when you want no installation or operations, and with **solo** when you want everything on your own computer.

| If…                                                                          | …pick this   |
| ---------------------------------------------------------------------------- | ------------ |
| I just want to try it on my laptop.                                          | `solo`       |
| Small team, comfortable running a VPS, data stays on our hardware.           | `cluster`    |
| Don't want to operate anything — give me an API key.                         | `cloud`      |
| Use SoyaOS's brain, but keep our workload on our hardware.                   | `hybrid`     |
| Multi-tenant SaaS for our customers, with SSO / SLA / SOC 2.                 | `ent-cloud`  |
| Bank / lab / regulated industry where outbound is denied by default.         | `ent-private`|

## Edition deep dives

### `solo` — in-process everything

Planet, Moon and Comet collapse into a single process on your machine. No registry, no auth, no network surface. The fastest way to feel SoyaOS, and the one we test most aggressively.

- **State**: SQLite under `~/.local/share/soyaos/` (or `%LOCALAPPDATA%` on Windows).
- **Auth**: none. The process listens on `127.0.0.1` only.
- **Limits**: only your hardware. We've run this on a 2018 MacBook Air.

### `cluster` — one Planet you run, Comets you scale

The default shape for an early-stage engineering team. One small VPS hosts the Planet; Comet workers attach via `soyaos join`. SoyaPack registry lives on any S3-compatible bucket.

- **State**: Postgres (recommended) or SQLite for tiny teams.
- **Auth**: shared org token at first, OIDC once you outgrow it.
- **Networking**: Comets only need outbound HTTPS to the Planet; they don't need to be reachable.

### `cloud` — hosted text Agent

Cloud v0.2.0 is live. Follow the [Cloud quickstart](/en/docs/cloud-quickstart), sign in with GitHub, and create an API key to call `soya:starter` at `https://api.soyaos.ai/v1`.

- **Lifecycle**: Stable v0.2.0; currently free, single-region, best-effort, and without an SLA.
- **Capabilities**: platform-reviewed text Agents only; no BYOK, custom SoyaPacks, tools, or arbitrary code execution.
- **Data**: request and trace metadata is retained for 24 hours; prompt and response bodies are not persisted by default.
- **Entry point**: [developer.soyaos.ai](https://developer.soyaos.ai/en); the API base URL is `https://api.soyaos.ai/v1`.

### `hybrid` — managed Planet, your Comets

The orchestration is hosted; the workload stays inside your perimeter. Useful when your data can't leave but you don't want to babysit a control plane. Comets attach to our Planet via outbound HTTPS only.

- **Use when**: HIPAA / PCI / "no customer data leaves our VPC" constraints.
- **Don't use when**: you also want the audit log to live on your hardware — pick `ent-private` then.

### `ent-cloud` — dedicated, multi-tenant SaaS

Dedicated regions, SSO/SAML, SOC 2 controls, signed audit log export. Same kernel as `solo` — only the operations are different. Sold via annual seats + an MSA.

### `ent-private` — on-prem or air-gapped

Ship the same binary into a sealed network. Update via signed offline bundles. Tested against banks and labs where outbound is denied by default. The signing key lives with the customer; we don't have a back door.

## Switching editions

There is no separate install — `soyaos` is the same binary. Switching is a config flag change. Migrations between editions are designed to be **non-destructive**: SoyaPacks, capability allowlists and Scope events round-trip.

| From       | To           | What changes                                                              |
| ---------- | ------------ | ------------------------------------------------------------------------- |
| `solo`     | `cluster`    | Move state from local SQLite → Postgres; point Comets at the Planet URL.  |
| `cluster`  | `cloud`      | v0.2.0 does not accept custom SoyaPacks; applications must use a reviewed Agent and a Cloud API key. |
| `cluster`  | `hybrid`     | Same Comets; the Planet URL flips to ours.                                |
| `cloud`    | `hybrid`     | Spin up Comets in your VPC; flip Comets-only.                             |
| `*`        | `ent-private`| Manual — talk to us. Air-gapped means we ship you a signed offline bundle.|

A concrete `solo` → `cluster` cutover looks like:

```bash
# On your VPS:
soyaos start --edition cluster --bind 0.0.0.0:8443 --state postgres://...

# On your laptop, where solo was running:
soyaos pack push hello                                # publish SoyaPacks to the new Planet
soyaos join --moon https://moon.example.com --token <invite>
```

## What stays the same across editions

- **OpenAI-compatible surface** on `/v1/chat/completions`.
- **Model IDs** use the `soya:*` shape.
- **Errors** use an OpenAI-compatible envelope.

Solo and future self-hosted editions continue to use SoyaPacks, capability allowlists, Scope events, and the CLI. Cloud v0.2.0 reuses the call contract but does not promise those deployment capabilities.

See [Architecture](./architecture.md) for the Planet / Moon / Comet model behind the matrix.
