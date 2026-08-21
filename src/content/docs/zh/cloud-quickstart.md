---
title: Cloud 快速上手
description: 五分钟登录 SoyaOS Cloud、创建 API Key，并跑通第一个托管 Agent 场景。
order: 2
category: getting-started
---

这条路径不需要安装 SoyaOS、不需要部署服务器。你只需要 GitHub 账号、浏览器和一个能运行 `curl` 的终端，就能调用生产环境中的托管 Agent。

想在自己的电脑上运行 SoyaOS？请改看[本地 Solo 快速上手](/zh/docs/quickstart)。Cloud v0.2.0 目前只开放平台审核的文本 Agent，不能上传或执行自己的 SoyaPack、工具或任意代码。

## 跑通后你会得到什么

你会把一段产品需求交给 `soya:starter`，让它拆成三项今天可以完成的任务，然后在开发者门户里用请求 ID 找到这次调用的 Trace。

整个过程通常不超过五分钟：

1. 使用 GitHub 登录；
2. 创建一个 API Key；
3. 查询可用模型；
4. 调用 `soya:starter`；
5. 用 `x-request-id` 核对用量和 Trace。

## 1. 登录开发者门户

打开 [SoyaOS Developer Portal](https://developer.soyaos.ai/zh)，点击 **使用 GitHub 继续**。首次登录会自动创建你的个人租户，不需要填写组织或付款信息。

如果 GitHub 授权完成后仍回到登录页，请先确认浏览器没有阻止 Cookie，再重试一次。服务状态可以在 [status.soyaos.ai](https://status.soyaos.ai/zh) 查看。

## 2. 创建 API Key

进入 [API 密钥](https://developer.soyaos.ai/zh/api-keys)，创建一个名为 `cloud-quickstart` 的 Key。

完整 Key 只显示一次，格式类似：

```text
sk-soya-<key_id>.<secret>
```

立即保存到密码管理器。不要把 Key 放进源码、截图、聊天消息或 `.env` 模板；教程完成后不再使用时，可以回到同一页面撤销。

在 macOS、Linux、WSL、Git Bash 或其他 Bash 兼容终端中，安全地读入当前会话：

```bash
printf '粘贴 SoyaOS API Key，然后按回车：'
IFS= read -r -s SOYA_API_KEY
printf '\n'
export SOYA_API_KEY
```

输入不会显示在屏幕上，变量只对当前终端会话有效。

## 3. 查询可用模型

先验证 Key，并确认 `soya:starter` 当前可用：

```bash
curl -sS https://api.soyaos.ai/v1/models \
  -H "Authorization: Bearer ${SOYA_API_KEY}"
```

成功时返回 `200`，JSON 的 `data` 数组中至少包含：

```json
{
  "id": "soya:starter",
  "object": "model"
}
```

如果这里返回 `401`，先不要继续：重新复制 Key，检查前后没有空格，并确认它没有被撤销。

## 4. 跑通第一个入门场景

下面的请求让 Agent 把一段产品需求拆成三个可执行任务。使用 `-i` 是为了同时看到响应头中的 `x-request-id`。

```bash
curl -i -sS https://api.soyaos.ai/v1/chat/completions \
  -H "Authorization: Bearer ${SOYA_API_KEY}" \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "soya:starter",
    "messages": [
      {
        "role": "user",
        "content": "我正在做一个个人记账应用。请把这个需求拆成 3 个今天可以完成的开发任务：用户可以录入支出，并按月份查看汇总。"
      }
    ],
    "max_tokens": 256,
    "stream": false
  }'
```

成功时你会看到：

- HTTP 状态为 `200`；
- 响应头包含 `x-request-id: ...`；
- `choices[0].message.content` 中有三项任务；
- `usage` 中有本次调用的输入、输出和总 token 数。

输出措辞每次可能不同，但必须非空。复制 `x-request-id` 的值，下一步会用到。

## 5. 核对用量和 Trace

打开 [用量与 Trace](https://developer.soyaos.ai/zh/usage)，把刚才的 `x-request-id` 粘贴到请求 ID 筛选框。正常情况下，你会看到对应模型、状态码、耗时和 token 数。

Trace 元数据最多保留 24 小时。SoyaOS 默认不把 prompt 和 response 正文写入 D1 或请求 Trace，但请求正文会发送给托管模型完成推理，因此不要提交密码、密钥、受监管数据或需要指定数据驻留区域的内容。

## 不写代码也可以先试

想先确认账号和 Key 是否正常，可以打开[调试台](https://developer.soyaos.ai/zh/playground)：粘贴 Key、选择 `soya:starter`、输入同一段需求并运行。Portal 只把 Key 发送给 `api.soyaos.ai`，不会保存它。

调试台适合手动试验；接入应用时仍应使用上面的 OpenAI 兼容 API。

## 当前免费额度与边界

Cloud v0.2.0 当前免费、单区、best-effort、无 SLA。个人租户的默认限制是：

| 限制 | 当前值 |
| --- | ---: |
| 每分钟请求 | 20 |
| 同时在途请求 | 2 |
| 每日请求 | 100 |
| 每日总 token | 100,000 |
| 有效 API Key | 3 |
| Trace 保留 | 24 小时 |

每日额度在 `00:00 UTC` 重置。当前版本不支持计费、组织租户、BYOK、自定义 SoyaPack、Tool Calls、MCP、图片、音频、文件或任意代码执行。

## 常见错误

**`401`**——Key 缺失、复制不完整、已撤销或环境变量没有设置。重新运行第 2、3 步。

**`404`**——模型 ID 不存在。先调用 `/v1/models`，使用实际返回的 `soya:*` ID。

**`429`**——达到每分钟、并发、每日请求或 token 限额。查看 `Retry-After`，等待后重试；不要无间隔循环请求。

**`502` / `503`**——平台或托管模型暂时不可用。保存 `x-request-id`，稍后重试，并查看[状态页](https://status.soyaos.ai/zh)。

**没有在用量页看到 Trace**——确认登录的是创建该 Key 的同一个 GitHub 账号，并等待几秒后刷新。跨租户请求不会显示。

## 清理

教程完成后，如果这个 Key 不会继续用于开发：

1. 回到 [API 密钥](https://developer.soyaos.ai/zh/api-keys)；
2. 撤销 `cloud-quickstart`；
3. 清除当前终端变量：

```bash
unset SOYA_API_KEY
```

接下来可以阅读 [HTTP API](/zh/docs/http-api) 了解请求和错误合同，或在[开发者门户文档](https://developer.soyaos.ai/zh/docs)查看 Cloud 控制面说明。
