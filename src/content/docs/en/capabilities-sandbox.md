---
title: Capabilities & sandbox
description: How Comet enforces what an Agent can and cannot do.
order: 1
category: concepts
---

Every Agent in SoyaOS runs inside a **Comet sandbox** with a **capability allowlist**. Anything not declared in `capabilities` is denied. The model is fail-closed: the default state is "you cannot touch the outside world", and the manifest opts back in for specific, narrow capabilities.

## Why a capability model

Three pressures shaped this:

1. **Untrusted authorship.** SoyaPacks come from anywhere. A pack you `pull`-ed yesterday should not be able to exfiltrate your data today if the author flipped malicious.
2. **Trustworthy audit.** When an incident happens, you want to answer "what was this pack allowed to reach?" by reading one block in one YAML file, not crawling Go code.
3. **Reproducibility.** Capability declarations double as a contract for Comet's cache: a pack with `egress: []` and `determinism_tier: read-only` is provably cacheable.

## What gets gated

| Surface          | Mechanism                              | Bypass possible?                       |
| ---------------- | -------------------------------------- | -------------------------------------- |
| Network egress   | Per-host:port:protocol allowlist; resolved at run time | No — DNS resolution itself goes through the allowlist. |
| Filesystem read  | Mount-namespace + bind mounts, prefix-matched | No — paths not on the read list are 404. |
| Filesystem write | Same as read; writes outside `fs.write` get EACCES | No. |
| Process exec     | Only the pack's own interpreter; subprocess spawn is denied | No. |
| Time access      | Real time (`clock_gettime`) is allowed; setting time is not | n/a — needed for sane logs. |
| Random           | `/dev/urandom` is always available | n/a. |
| Outbound DNS     | Resolved through the Moon (which enforces the allowlist) | No. |

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

- Each entry is a triple — host + port + protocol — and all three must match for the connection to succeed.
- Wildcards are accepted (`*.openai.com`) but `pack lint --strict` flags them.
- IP literals (`192.168.1.1`) are accepted, but discouraged — they don't survive a service migration.
- Egress is enforced **inside the Comet**; even if your tool tries to bypass the manifest with a raw socket, the kernel netfilter chain set up at Comet start blocks the connection.

If your pack needs an unknown number of hosts (e.g. a web-crawling Agent), you have two honest options:

- **Use `unrestricted` determinism + `egress: ["*"]`** — explicit about being a black box. Comet refuses to cache results.
- **Add a Moon-side proxy** — the Moon's HTTP proxy can be the only `egress` entry; the Moon then enforces its own list. Recommended for production.

## Filesystem

```yaml
capabilities:
  fs:
    read:
      - /workdir          # always available; explicit-is-better
      - /workdir/inputs
    write:
      - /workdir/out
```

- All paths are *inside* the sandbox. The host filesystem is invisible — the Comet creates a fresh mount namespace at start.
- Prefix-matched. `/workdir/out/foo.json` is allowed by `fs.write: [/workdir/out]`.
- `/workdir` itself is always read-only unless you list a subpath as writable.
- Read of an undeclared path returns ENOENT, not EACCES — i.e., the file looks like it doesn't exist. This is intentional: never leak the host's directory structure.

## Determinism tiers

| Tier             | Semantics                                                   | Cached? |
| ---------------- | ----------------------------------------------------------- | ------- |
| `read-only`      | Same input always produces the same output (up to LLM nondeterminism). | Yes, by input hash. |
| `side-effect`    | The Agent makes observable changes outside the sandbox (creates a Linear issue, posts to Slack, writes to a DB). | No. |
| `unrestricted`   | Escape hatch. Treats the Agent as fully opaque. Implies `side-effect`. | No. |

The tier is enforced by Comet on the Agent's behavior, not just its declaration. If an Agent declares `read-only` but its `tools` contain `kind: builtin.http_post`, validation fails at push time.

## What happens on a violation

When the Comet detects a capability violation (network, fs, exec):

1. The current syscall returns EACCES / ENOENT / ECONNREFUSED — the Agent code sees a normal-looking error.
2. A `capability_violation` Scope event is emitted with the offending surface, requested resource, and matching manifest entry (or "no match").
3. The run exits with code `3`.
4. The Moon flags the pack version in the registry; subsequent runs of the same version emit a warning on each invocation until the pack is patched.

In CI:

```bash
$ soyaos pack lint . --strict
err   capabilities.egress declares `api.openai.com:443` but tools.fetch uses `api.anthropic.com:443`
1 error · 0 warnings
```

## Tooling support

- `soyaos pack validate .` — checks the manifest's shape.
- `soyaos pack lint .` — checks coherence between `capabilities`, `tools`, and `examples`.
- `soyaos pack lint . --strict` — fails on wildcard hosts, missing examples for declared capabilities, and `determinism_tier` mismatches.

See [SoyaPack v0 manifest](../reference/soyapack-v0.md) for the manifest schema, and [Scope events](./scope-events.md) for the event envelope.
