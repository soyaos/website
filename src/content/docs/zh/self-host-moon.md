---
title: 自托管 Moon（VPS）
description: 为团队拉起一个 cluster 版 Moon——仓库、鉴权、Comet。
order: 2
category: guides
---

`cluster` 版本的具体玩法：一台 VPS 跑 Moon，Comet 从你的 LAN 或 VPC 接入，SoyaPack 放在一个 S3 兼容存储里。前置准备好的话约 30 分钟，加上 DNS 生效时间。

## 前置

- 一台有公网 IPv4 / IPv6 的 VPS（任意云，2 vCPU / 4 GB 够小团队用）。
- 你能控制的一条 DNS A/AAAA 记录——`moon.example.com` 是本文约定。
- 一个 S3 兼容存储——Cloudflare R2、Backblaze B2、同机自托管 MinIO、AWS S3 都行。
- 一个 Postgres 16+。托管服务可以；非常小的团队也可以用内置 SQLite。
- 可选但推荐：Postgres 连接串带 `sslmode=require`。

## 1. VPS 上安装

任选一种：

```bash
# Homebrew（Linuxbrew）
brew tap soyaos/soyaos && brew install soyaos

# 一行脚本
curl -L https://soyaos.ai/install | sh

# Docker（可重复升级的首选）
docker pull soyaos/soyaos:0.1.0
```

确认：

```bash
$ soyaos version
soyaos 0.1.0 (...)
```

## 2. 准备状态后端

建 Postgres 库 + S3 兼容桶。Moon 对两者都要读写权限。

```sql
CREATE DATABASE soyaos;
CREATE USER soyaos_app WITH PASSWORD '…';
GRANT ALL PRIVILEGES ON DATABASE soyaos TO soyaos_app;
```

桶最小策略（R2 / S3 写法略有不同）：

- `s3:PutObject`、`s3:GetObject`、`s3:DeleteObject` on `soya-packs/*`
- `s3:ListBucket` on `soya-packs`

## 3. 写配置

`/etc/soyaos/moon.yaml`：

```yaml
moon:
  bind: 0.0.0.0:8443
  external_url: https://moon.example.com
  tls:
    # 二选一：
    auto: { provider: letsencrypt, email: ops@example.com }
    # 或：
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
  org_token: ${SOYAOS_ORG_TOKEN}     # 初始引导用；之后切 OIDC

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

签一个强 `SOYAOS_ORG_TOKEN`：`openssl rand -hex 32`。

## 4. 启动 Moon

```bash
sudo SOYAOS_POSTGRES_DSN=… R2_ACCESS_KEY=… R2_SECRET_KEY=… \
  ANTHROPIC_API_KEY=… OPENAI_API_KEY=… SOYAOS_ORG_TOKEN=… \
  soyaos start --edition cluster --config /etc/soyaos/moon.yaml
```

预期看到：

```
▶ cluster: planet+moon roles
▶ Moon listening on 0.0.0.0:8443
▶ Registry backend: s3://soya-packs/ (probe ok in 142ms)
▶ State: postgres://soya-app@…:5432/soyaos (latency 3ms)
▶ ACME: issued cert for moon.example.com
ready in 1.2s
```

生产用 systemd 托管：

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

## 5. 从 LAN 接入 Comet

每台 Comet 主机（笔记本、内网机、VPC 节点）：

```bash
# 在 Moon 上签发一次性 invite token：
soyaos --config /etc/soyaos/moon.yaml auth keys create --kind comet-invite
# → comet-invite_018f3a...

# 在 Comet 主机上：
soyaos join \
  --moon  https://moon.example.com \
  --token comet-invite_018f3a...
```

Comet 对 Moon 开一个出网 HTTPS WebSocket，等任务。同样用 systemd / launchd 托管。

Comet 可以加入特定池：`--pool gpu`（GPU + CPU 混跑时用）。池在 SoyaPack 的 `placement.pool:` 里引用。

## 6. 推一个 SoyaPack 并跑

从开发机：

```bash
soyaos auth login --moon https://moon.example.com    # 浏览器登录
soyaos pack push hello                                # 发布到 Moon 仓库

curl https://moon.example.com/v1/chat/completions \
  -H "Authorization: Bearer $(soyaos auth keys list --moon https://moon.example.com --first)" \
  -d '{"model":"soya:hello","messages":[{"role":"user","content":"hi"}]}'
```

看到 `{"reply":"hi"}` 回来就跑通了。

## 7. 运维基本盘

**备份。** Postgres + S3 桶一起，就完整描述了一个 Moon。每晚 `pg_dump` 加桶的生命周期策略（带版本、30 天保留）足够。

**升级。** `brew upgrade soyaos` 或 `docker pull soyaos/soyaos:0.2.0`，重启服务。schema 迁移在启动时跑。

**监控。** Moon 在 `/metrics`（鉴权后）暴露 Prometheus 指标。关键 SLI：

- `soyaos_run_latency_seconds` ——每个包的运行延迟直方图。
- `soyaos_comet_pool_warm` ——每个池的热 Comet 数。
- `soyaos_scope_events_emitted_total` ——计数。

**鉴权迁移。** 组织 token 长大用不动时，切 OIDC：

```yaml
auth:
  oidc:
    issuer:        https://auth.example.com
    client_id:     soyaos-moon
    client_secret: ${OIDC_SECRET}
```

之后吊销组织 token。模式是「先加再减」——让组织 token 多活一天捞掉零散调用方。

## 你没做的事

没写 Planet 配置。`cluster` 里 Moon 兼任 Planet 角色——联邦正是 `cluster` 不要的。日后需要跨 Moon 路由或多 Moon 共享身份时，再考虑加 Planet（或者升 `ent-cloud`）。

## 想看更多

- [版本](../getting-started/editions.md) ——什么时候从 `cluster` 迁到 `hybrid` 或 `ent-cloud`。
- [签名与发布 SoyaPack](./sign-and-publish.md) ——发包流程做扎实时。
- [HTTP API](../reference/http-api.md) ——直接调 Moon 的客户端要看。
