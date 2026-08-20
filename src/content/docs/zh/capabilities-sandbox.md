---
title: 能力与沙箱
description: Comet 怎么强制一个 Agent 能做什么、不能做什么。
order: 1
category: concepts
---

SoyaOS 里的每个 Agent 都跑在 **Comet 沙箱**里，受**能力白名单**约束。任何没在 `capabilities` 里声明的事都被拒绝。模型是 fail-closed：默认状态是「你碰不到外部世界」，清单按需开口子。

## 为什么要能力模型

三股压力推出这个模型：

1. **作者不可信。** SoyaPack 可能来自任何地方。你昨天 `pull` 的一个包，今天作者翻脸要导你数据时，它应该没这个本事。
2. **审计可信。** 出事时，你想看一眼一份 YAML 里的一个块就回答「这个包当时能访问什么」，而不是去爬 Go 代码。
3. **可重现。** 能力声明同时是 Comet 缓存的合约：`egress: []` + `determinism_tier: read-only` 的包，可证明是可缓存的。

## 什么被守住

| 表面          | 机制                                                        | 能绕过吗？                              |
| ------------- | ----------------------------------------------------------- | --------------------------------------- |
| 网络出网      | 按 host:port:protocol 三元组白名单；运行时解析              | 不能——DNS 解析本身也走白名单。         |
| 文件系统读    | mount namespace + bind mount，按前缀匹配                    | 不能——白名单外的路径是 404。           |
| 文件系统写    | 同读；`fs.write` 外的写入 EACCES                            | 不能。                                 |
| 进程 exec     | 只允许包自己的解释器；spawn 子进程被拒                       | 不能。                                 |
| 时间访问      | 读实时时钟（`clock_gettime`）允许；设置时间不允许            | n/a——日志要用。                       |
| 随机数        | `/dev/urandom` 永远可用                                     | n/a。                                  |
| DNS 出站      | 通过 Moon 解析（Moon 强制白名单）                            | 不能。                                 |

## Egress

```yaml
capabilities:
  egress:
    - host: api.openai.com
      port: 443
      protocol: https
    - host: hooks.slack.com
      port: 443
      protocol: https
```

- 每条是三元组——host + port + protocol——三者都匹配才能连通。
- 接受通配符（`*.openai.com`），但 `pack lint --strict` 会标红。
- 接受 IP 直写（`192.168.1.1`），但不鼓励——服务迁移就坏了。
- Egress 在 **Comet 内部**强制；即使你的工具用裸 socket 想绕，Comet 启动时设的内核 netfilter 链也会拦下。

如果你的包确实需要不固定数量的主机（比如爬虫 Agent），有两个老实的选择：

- **用 `unrestricted` + `egress: ["*"]`** ——明说自己是黑盒。Comet 拒绝缓存结果。
- **加一个 Moon 端代理**——只把 Moon 的 HTTP 代理放进 `egress`；Moon 自己再持一份白名单。生产推荐。

## 文件系统

```yaml
capabilities:
  fs:
    read:
      - /workdir          # 总是可用；显式写出来更清晰
      - /workdir/inputs
    write:
      - /workdir/out
```

- 所有路径都是沙箱*内部*的。宿主文件系统不可见——Comet 启动时建一个全新的 mount namespace。
- 前缀匹配。`/workdir/out/foo.json` 在 `fs.write: [/workdir/out]` 下放行。
- `/workdir` 本身默认只读，除非你把某个子路径列进可写。
- 读未声明的路径返回 ENOENT 而不是 EACCES——也就是「这文件不存在」。故意的：永不泄露宿主目录结构。

## 确定性等级

| 等级             | 语义                                                              | 缓存？  |
| ---------------- | ----------------------------------------------------------------- | ------- |
| `read-only`      | 相同输入总是产生相同输出（上游 LLM 非确定性除外）。                | 是，按输入 hash。 |
| `side-effect`    | Agent 在沙箱外产生可观测变化（建 Linear issue、发 Slack、写库）。  | 否。     |
| `unrestricted`   | 逃生口。把 Agent 当完全黑盒。隐含 `side-effect`。                  | 否。     |

等级是按 Agent 的**行为**而不是仅按声明强制的。如果一个 Agent 声明 `read-only` 但 `tools` 里有 `kind: builtin.http_post`，push 时校验失败。

## 违规会怎么样

Comet 检测到能力越界（网络、fs、exec）时：

1. 当前 syscall 返回 EACCES / ENOENT / ECONNREFUSED——Agent 代码看到的是「正常」错误。
2. 发一条 `capability_violation` 的 Scope 事件，含违规表面、申请资源、匹配的清单条目（或「无匹配」）。
3. 运行以退出码 `3` 结束。
4. Moon 在仓库里给该包版本打标；后续相同版本的调用每次都警告，直到包被修。

CI 里：

```bash
$ soyaos pack lint . --strict
err   capabilities.egress 声明了 `api.openai.com:443` 但 tools.fetch 用的是 `api.anthropic.com:443`
1 error · 0 warnings
```

## 工具支持

- `soyaos pack validate .` ——校验清单形状。
- `soyaos pack lint .` ——校验 `capabilities`、`tools`、`examples` 之间的一致性。
- `soyaos pack lint . --strict` ——通配符主机、声明了但没样例覆盖的能力、`determinism_tier` 不匹配，都失败。

清单 schema 见 [SoyaPack v0 清单](../reference/soyapack-v0.md)；事件 envelope 见 [Scope 事件](./scope-events.md)。
