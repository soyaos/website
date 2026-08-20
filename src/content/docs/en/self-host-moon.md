---
title: Self-host a Moon on a VPS
description: Stand up a cluster-edition Moon for your team — registry, auth, Comets.
order: 2
category: guides
---

This is the `cluster` edition recipe: one VPS hosts a Moon, Comets attach from your LAN or VPC, and SoyaPacks live in an S3-compatible bucket. About 30 minutes if you've got the prerequisites ready, plus DNS propagation time.

## Prerequisites

- A VPS with public IPv4 / IPv6 (any cloud, 2 vCPU / 4 GB RAM is enough for a small team).
- A DNS A/AAAA record you control — `moon.example.com` is the convention here.
- An S3-compatible bucket — Cloudflare R2, Backblaze B2, MinIO on the same VPS, or AWS S3.
- A Postgres database (16+). Managed services are fine; for very small teams, the bundled SQLite mode also works.
- Optional but recommended: a Postgres connection string with `sslmode=require`.

## 1. Install on the VPS

Pick one:

```bash
# Homebrew (Linuxbrew)
brew tap soyaos/soyaos && brew install soyaos

# One-line installer
curl -L https://soyaos.ai/install | sh

# Docker (recommended for repeatable upgrades)
docker pull soyaos/soyaos:0.1.0
```

Confirm:

```bash
$ soyaos version
soyaos 0.1.0 (...)
```

## 2. Provision state

Create a Postgres database and an S3-compatible bucket. The Moon needs RW on both.

```sql
CREATE DATABASE soyaos;
CREATE USER soyaos_app WITH PASSWORD '…';
GRANT ALL PRIVILEGES ON DATABASE soyaos TO soyaos_app;
```

Bucket policy minimum (R2 / S3 syntax varies; the role needs):

- `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject` on `soya-packs/*`
- `s3:ListBucket` on `soya-packs`

## 3. Write the config

`/etc/soyaos/moon.yaml`:

```yaml
moon:
  bind: 0.0.0.0:8443
  external_url: https://moon.example.com
  tls:
    # Pick one:
    auto: { provider: letsencrypt, email: ops@example.com }
    # or:
    # cert: /etc/soyaos/tls/fullchain.pem
    # key:  /etc/soyaos/tls/privkey.pem

state:
  postgres:
    dsn: ${SOYAOS_POSTGRES_DSN}

registry:
  backend: s3
  s3:
    endpoint: https://abc123.r2.cloudflarestorage.com
    bucket:   soya-packs
    region:   auto
    access_key: ${R2_ACCESS_KEY}
    secret_key: ${R2_SECRET_KEY}

auth:
  org_token: ${SOYAOS_ORG_TOKEN}     # initial bootstrap; rotate to OIDC later

upstreams:
  claude:
    kind: anthropic
    base_url: https://api.anthropic.com
    api_key: ${ANTHROPIC_API_KEY}
  openai:
    kind: openai
    base_url: https://api.openai.com
    api_key: ${OPENAI_API_KEY}
```

Mint a strong `SOYAOS_ORG_TOKEN` once: `openssl rand -hex 32`.

## 4. Start the Moon

```bash
sudo SOYAOS_POSTGRES_DSN=… R2_ACCESS_KEY=… R2_SECRET_KEY=… \
  ANTHROPIC_API_KEY=… OPENAI_API_KEY=… SOYAOS_ORG_TOKEN=… \
  soyaos start --edition cluster --config /etc/soyaos/moon.yaml
```

You should see:

```
▶ cluster: planet+moon roles
▶ Moon listening on 0.0.0.0:8443
▶ Registry backend: s3://soya-packs/ (probe ok in 142ms)
▶ State: postgres://soya-app@…:5432/soyaos (latency 3ms)
▶ ACME: issued cert for moon.example.com
ready in 1.2s
```

Run under systemd for production:

```ini
# /etc/systemd/system/soyaos-moon.service
[Unit]
Description=SoyaOS Moon
After=network-online.target

[Service]
User=soyaos
EnvironmentFile=/etc/soyaos/moon.env
ExecStart=/usr/local/bin/soyaos start --edition cluster --config /etc/soyaos/moon.yaml
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

## 5. Join Comets from your LAN

On each Comet host (laptops, intranet boxes, VPC nodes):

```bash
# On the Moon — mint a single-use invite token:
soyaos --config /etc/soyaos/moon.yaml auth keys create --kind comet-invite
# → comet-invite_018f3a...

# On the Comet host:
soyaos join \
  --moon  https://moon.example.com \
  --token comet-invite_018f3a...
```

The Comet opens an outbound HTTPS WebSocket to the Moon and waits for work. Run it under systemd / launchd the same way.

A Comet can attach to a specific pool with `--pool gpu` (useful when you have GPU and CPU workers). Pools are referenced from SoyaPacks via `placement.pool:`.

## 6. Push a SoyaPack and run it

From a dev machine:

```bash
soyaos auth login --moon https://moon.example.com    # browser-based
soyaos pack push hello                                # publishes to the Moon's registry

curl https://moon.example.com/v1/chat/completions \
  -H "Authorization: Bearer $(soyaos auth keys list --moon https://moon.example.com --first)" \
  -d '{"model":"soya:hello","messages":[{"role":"user","content":"hi"}]}'
```

If you see `{"reply":"hi"}` come back, you're done.

## 7. Operational basics

**Backups.** Postgres + the S3 bucket together fully describe a Moon. A nightly `pg_dump` plus the bucket lifecycle policy (versioned, 30-day retention) is enough.

**Upgrades.** `brew upgrade soyaos` or `docker pull soyaos/soyaos:0.2.0`, then restart the service. Schema migrations run on start.

**Monitoring.** The Moon exposes Prometheus metrics at `/metrics` (auth-gated). Key SLIs:

- `soyaos_run_latency_seconds` — per-pack run latency histogram.
- `soyaos_comet_pool_warm` — warm Comets per pool.
- `soyaos_scope_events_emitted_total` — counter.

**Auth migration.** When the org token outgrows you, configure an OIDC issuer:

```yaml
auth:
  oidc:
    issuer:        https://auth.example.com
    client_id:     soyaos-moon
    client_secret: ${OIDC_SECRET}
```

Then revoke the org token. The pattern is "additive then subtract" — leave the org token live for an overlap day to catch stragglers.

## What you didn't have to do

You did not write a Planet config. In `cluster`, the Moon plays the Planet role too — federation is what `cluster` opts out of. If you later need cross-Moon routing or shared identity across multiple Moons, that's the moment to add a Planet (or move to `ent-cloud`).

## Where to read more

- [Editions](../getting-started/editions.md) — when to migrate from `cluster` to `hybrid` or `ent-cloud`.
- [Sign and publish a SoyaPack](./sign-and-publish.md) — once the pack flow gets real.
- [HTTP API](../reference/http-api.md) — for clients calling the Moon directly.
