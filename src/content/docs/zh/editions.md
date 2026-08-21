---
title: 版本
description: 同一份二进制衍生出的六种部署形态——从 Solo 到 Enterprise Private。
order: 4
category: getting-started
---

SoyaOS 的*版本*描述控制面与工作负载跑在哪里、由谁运维。Solo 使用本地二进制；Cloud v0.2.0 是已经上线的托管文本 Agent 服务，通过开发者门户和 OpenAI 兼容 API 使用。其他版本仍属于路线图。

```bash
soyaos start --edition solo      # 当前本地运行入口
```

## 矩阵

| 版本                 | 控制面（Planet）                  | 数据面（Comet）                        | 适用人群                              | 典型成本                       | 状态        |
| -------------------- | ---------------------------------- | -------------------------------------- | ------------------------------------- | ------------------------------ | ----------- |
| `solo`               | 进程内                             | 进程内                                 | 一个开发者、一台笔记本                 | 免费 · 你的硬件                | alpha 在用  |
| `cluster`            | 自托管 Planet 在你的 VPS           | 自托管 Comet 在你的 LAN / VPC          | 一个团队 + 一台 VPS + 内网设备         | 约 $0.10 / Comet·小时（估）    | 规划中      |
| `cloud`              | 托管个人租户与 API Key              | 平台审核的托管文本 Agent                | 注册、拿 API Key、开干                 | 当前免费 · 有每日额度           | Stable v0.2.0 |
| `hybrid`             | soyaos.ai 托管 Planet              | 你 VPC / 自有机房里的 Comet            | SaaS Planet，你自己的 Moon             | 按 token（只算控制面）         | 规划中      |
| `ent-cloud`          | 独占 Planet（按 region 绑定）      | 独占 Comet 池                          | 多租户 SaaS + SSO + SLA                | 联系我们                       | 规划中      |
| `ent-private`        | 客户自运维 Planet                  | 客户自运维 Comet                       | 本地化 / 物理隔离网络                  | 年度授权                       | 规划中      |

> 各版本都以 **OpenAI 兼容 API** 作为主要调用面。Cloud v0.2.0 目前只开放平台审核的文本 Agent，不支持上传或执行用户自己的 SoyaPack；完整 Cloud 架构仍是路线图。

## 决策树

按行往下匹配，第一个命中的就选：不想安装或运维时从 **cloud** 开始；想完全在自己电脑上运行时从 **solo** 开始。

| 如果……                                                              | ……选         |
| -------------------------------------------------------------------- | ------------- |
| 我只是想在笔记本上试一下。                                           | `solo`        |
| 小团队，能自己跑 VPS，数据要留在自己的硬件上。                       | `cluster`     |
| 不想运维任何东西——给我一个 API Key 就行。                            | `cloud`       |
| 用 SoyaOS 的大脑，但工作负载留在自己的硬件上。                       | `hybrid`      |
| 给我们的客户做多租户 SaaS，要 SSO / SLA / SOC 2。                    | `ent-cloud`   |
| 银行 / 实验室 / 强监管行业，出网默认拒绝。                           | `ent-private` |

## 各版本细读

### `solo` — 所有东西都在进程里

Planet、Moon、Comet 折叠成机器上的单一进程。无注册中心、无鉴权、无网络面。感受 SoyaOS 最快的方式，也是我们测试最深的形态。

- **状态存储**：`~/.local/share/soyaos/` 下的 SQLite（Windows 是 `%LOCALAPPDATA%`）。
- **鉴权**：无。进程只监听 `127.0.0.1`。
- **上限**：只受硬件限制。我们在一台 2018 MacBook Air 上跑过。

### `cluster` — 一个你跑的 Planet + 你扩的 Comet

创业期工程团队的默认形态。一台小 VPS 跑 Planet；Comet 工作节点用 `soyaos join` 接入。SoyaPack 清单仓库放在任意 S3 兼容存储。

- **状态存储**：Postgres（推荐），小团队也可用 SQLite。
- **鉴权**：初期共享组织 token，长大后切 OIDC。
- **网络**：Comet 只需对 Planet 出网 HTTPS；不需要可入站访问。

### `cloud` — 托管文本 Agent

Cloud v0.2.0 已正式发布。打开 [Cloud 快速上手](/zh/docs/cloud-quickstart)，使用 GitHub 登录、创建 API Key，即可调用 `https://api.soyaos.ai/v1` 上的 `soya:starter`。

- **生命周期**：Stable v0.2.0；当前免费、单区、best-effort、无 SLA。
- **能力**：平台审核的文本 Agent；不支持 BYOK、自定义 SoyaPack、工具或任意代码执行。
- **数据**：请求元数据与 Trace 保留 24 小时；默认不持久化 prompt / response 正文。
- **入口**：[developer.soyaos.ai](https://developer.soyaos.ai/zh)；API Base URL 为 `https://api.soyaos.ai/v1`。

### `hybrid` — 托管 Planet，你的 Comet

编排在云端，工作负载留在你的边界内。适合数据出不去、又不想自己运维控制面的场景。Comet 只需对我们 Planet 出网 HTTPS。

- **何时用**：HIPAA / PCI /「客户数据不出 VPC」这种约束。
- **何时别用**：你还想把审计日志也放在自己机器上——那就直接选 `ent-private`。

### `ent-cloud` — 独占多租户 SaaS

独占 region、SSO/SAML、SOC 2 合规、签名审计日志导出。和 `solo` 同一个内核——区别只在运维。按年付席次 + MSA 合同。

### `ent-private` — 本地化或物理隔离

同一份二进制部署进封闭网络。通过签名离线升级包更新。在出网默认拒绝的银行、实验室环境里验证过。签名 Key 在客户手里——我们没有后门。

## 切换版本

没有「另装一份」这种事——`soyaos` 是同一份二进制。切换只是改一个配置参数。版本间迁移设计为**非破坏性**：SoyaPack、能力白名单、Scope 事件都能 round-trip。

| 从           | 到           | 变了什么                                                             |
| ------------ | ------------ | -------------------------------------------------------------------- |
| `solo`       | `cluster`    | 状态从本地 SQLite → Postgres；Comet 指向 Planet URL。                  |
| `cluster`    | `cloud`      | v0.2.0 暂不接受自定义 SoyaPack；应用只能改用当前审核 Agent 与 Cloud API Key。 |
| `cluster`    | `hybrid`     | Comet 不动；Planet URL 切到我们的。                                  |
| `cloud`      | `hybrid`     | 在你 VPC 里起 Comet；只切 Comet 一端。                               |
| `*`          | `ent-private`| 人工——联系我们。物理隔离意味着我们给你寄一份签名离线包。              |

`solo` → `cluster` 的实际切换长这样：

```bash
# 在你的 VPS 上：
soyaos start --edition cluster --bind 0.0.0.0:8443 --state postgres://...

# 在你之前跑 solo 的笔记本上：
soyaos pack push hello                                # 把 SoyaPack 发布到新 Planet
soyaos join --moon https://moon.example.com --token <invite>
```

## 跨版本不变的东西

- **OpenAI 兼容 surface** 在 `/v1/chat/completions`。
- **模型 ID** 使用 `soya:*` 形状。
- **错误响应** 使用 OpenAI 兼容 envelope。

Solo 与未来自托管版本继续使用 SoyaPack、能力白名单、Scope 事件和 CLI。Cloud v0.2.0 只复用调用合同，不承诺开放这些部署能力。

矩阵背后的 Planet / Moon / Comet 模型，见[架构](./architecture.md)。
