---
title: Editions
description: Six deployment shapes from one binary — Solo to Enterprise Private.
order: 3
category: getting-started
---

SoyaOS is one binary. The *edition* is a deployment shape — which node roles run where, who operates them, and how they federate. The CLI flag is the only line you change.

```bash
soyaos start --edition solo      # or cluster | cloud | hybrid | ent-cloud | ent-private
```

## The matrix

| Edition              | Control plane (Planet)             | Data plane (Comets)                 | Persona                                    | Typical cost                     | Status     |
| -------------------- | ---------------------------------- | ----------------------------------- | ------------------------------------------ | -------------------------------- | ---------- |
| `solo`               | in-process                         | in-process                          | One dev, one laptop                        | Free · your hardware             | alpha now  |
| `cluster`            | self-hosted Planet on your VPS     | self-hosted Comets in your LAN/VPC  | A team + VPS + intranet devices            | ~$0.10 / Comet·hr (est.)         | planned    |
| `cloud`              | soyaos.ai-managed Planet           | soyaos.ai-managed Comets            | Register, get an API key, ship             | per-token + per Comet·sec        | planned    |
| `hybrid`             | soyaos.ai-managed Planet           | your Comets in your VPC / on-prem   | SaaS Planet, your Moon                     | per-token (control plane only)   | planned    |
| `ent-cloud`          | dedicated Planet (region pinned)   | dedicated Comet pool                | Multi-tenant SaaS with SSO and SLA         | contact us                       | planned    |
| `ent-private`        | customer-operated Planet           | customer-operated Comets            | On-prem or air-gapped                      | annual license                   | planned    |

> Every edition runs the **same SoyaPack** format and exposes the **same OpenAI-compatible** API. The only thing that changes is the split point between "you operate it" and "we operate it" — and in `solo`, both ends collapse into a single process on your laptop.

## Decision tree

Pick the first row that matches; default to **solo** if you're new.

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

### `cloud` — managed Planet + managed Comets

We run everything. You hold an API key. The fastest path to "I have a working Agent endpoint." Drop in your own BYOK model key at any time and you stop paying us for inference — only for the compute we actually scheduled.

- **Regions**: tba (TBD pending alpha → beta).
- **Data**: your inputs/outputs are encrypted in transit and at rest. We do not train on them.

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
| `cluster`  | `cloud`      | Re-publish SoyaPacks to our registry; switch API keys to ours.            |
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

- **SoyaPack format** (`soyapack.yaml` v0).
- **OpenAI-compatible surface** on `/v1/chat/completions`.
- **Capability allowlists** — same shape, same enforcement.
- **Scope event schema** — your dashboards, alerts and audit log expect the same JSON.
- **CLI verbs** — `pack`, `run`, `serve`, `auth`, `join`. Only the flags differ.

See [Architecture](./architecture.md) for the Planet / Moon / Comet model behind the matrix.
