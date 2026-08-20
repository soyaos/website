---
title: SoyaPack v0 manifest
description: Reference for the soyapack.yaml v0 manifest — fields, capabilities, examples, common pitfalls.
order: 1
category: reference
---

`soyapack.yaml` is the single source of truth for a SoyaOS bundle. v0 freezes the small set of fields below; future versions add fields, never remove them. A pack also carries prompt files, optional templates, and example fixtures — but the manifest is the contract.

## Top-level fields

| Field              | Type     | Required           | Description                                                                                       |
| ------------------ | -------- | ------------------ | ------------------------------------------------------------------------------------------------- |
| `apiVersion`       | string   | yes                | Must be `soyaos.ai/v0`.                                                                           |
| `kind`             | enum     | yes                | One of `Agent`, `Tool`, `Skill`, `Model`.                                                         |
| `name`             | string   | yes                | DNS-label-safe; unique within an owner.                                                           |
| `version`          | string   | yes                | SemVer 2.0.0 (pre-release allowed, e.g. `0.1.0-alpha.0`).                                          |
| `virtual_model_id` | string   | for Agent kind     | The `soya:*` id this Agent claims (e.g. `soya:compo`).                                            |
| `description`      | string   | yes                | One-sentence summary.                                                                             |
| `owner`            | string   | yes                | GitHub handle or org.                                                                             |
| `license`          | string   | yes                | SPDX identifier (`MIT`, `Apache-2.0`, …).                                                         |
| `capabilities`     | object   | yes                | Capability allowlist — egress hosts, filesystem paths, determinism tier. See below.                |
| `inputs`           | object   | yes                | JSON Schema fragment describing the input contract.                                               |
| `outputs`          | object   | yes                | Map of artifact name → schema id (e.g. `guide.v1`).                                               |
| `prompts`          | object   | for Agent kind     | Map of stage name → relative path to a prompt file.                                               |
| `tools`            | object   | optional           | Map of tool name → declaration (built-in or external).                                            |
| `templates`        | object   | optional           | Map of template name → `html/template` file path. Used by artifact renderers.                      |
| `examples`         | object   | optional           | Map of example name → fixture file. Picked up by `soyaos pack lint`.                              |

## `capabilities`

The capability block is enforced by Comet at run time and audited by Moon at push time. The pack cannot do anything it doesn't declare here — fail-closed by default.

```yaml
capabilities:
  egress:
    - host: api.openai.com
      port: 443
      protocol: https
  fs:
    read:
      - /workdir
    write:
      - /workdir/out
  determinism_tier: read-only   # one of: read-only | side-effect | unrestricted
```

- `egress`: explicit allowlist. There is no implicit `0.0.0.0/0`. Wildcard hosts (`*.openai.com`) are accepted but discouraged — narrower is safer.
- `fs.read` / `fs.write`: absolute paths *inside* the Comet sandbox. `/workdir` is always available; everything else requires a declaration.
- `determinism_tier`: declares how reproducible this Agent's runs are. Comet uses it to decide cache eligibility:
  - `read-only` — same input always produces the same output (modulo upstream LLM nondeterminism). Cacheable.
  - `side-effect` — touches the network for observable side effects (creates a Linear issue, posts to Slack). Never cached.
  - `unrestricted` — escape hatch. Avoid unless you have a reason.

See [Capabilities & sandbox](../concepts/capabilities-sandbox.md) for the full enforcement model.

## A complete worked example

A modest "research summarizer" Agent that fetches one URL, asks an upstream LLM to extract bullet points, and emits a `summary.v1` artifact:

```yaml
# soyapack.yaml
apiVersion: soyaos.ai/v0
kind: Agent
name: research-summarizer
version: 0.1.0
virtual_model_id: soya:research-summarizer
description: Fetch a URL and produce 5–10 bullet points of the main argument.
owner: chzealot
license: MIT

capabilities:
  egress:
    - host: api.openai.com
      port: 443
      protocol: https
    - host: example.com           # any host the fetch tool may visit
      port: 443
      protocol: https
  fs:
    read:
      - /workdir
    write:
      - /workdir/out
  determinism_tier: read-only

inputs:
  type: object
  required: [url]
  properties:
    url:
      type: string
      format: uri
      description: The article to summarize.
    max_bullets:
      type: integer
      default: 8
      minimum: 3
      maximum: 12

outputs:
  summary: summary.v1            # schema declared in a separate registry

prompts:
  extract: prompts/extract.md
  summarize: prompts/summarize.md

tools:
  fetch:
    kind: builtin.http_get
    params:
      timeout: 15s
      max_bytes: 2_000_000

examples:
  short_blog:
    input: { url: "https://example.com/post", max_bullets: 5 }
  long_essay:
    input: { url: "https://example.com/essay", max_bullets: 12 }
```

Two prompt files (`prompts/extract.md`, `prompts/summarize.md`) live alongside this manifest. The `fetch` tool is the built-in HTTP getter; the two `egress` entries authorize exactly where it can go.

## Common pitfalls

**Egress too wide.** `host: "*"` is technically valid but defeats the security model. Comet will accept it but `pack lint --strict` flags it. Keep `egress` as narrow as your examples actually need.

**Writing outside `/workdir/out`.** Comet's sandbox makes `/workdir` writable but only by paths you declare in `fs.write`. Writes to `/workdir` directly (without listing it) get a `capability violation: fs.write` and the run aborts.

**`determinism_tier: side-effect` without external_id idempotency.** If your Agent posts to Slack on every run, you'll spam. Either bake an idempotency key into the call (recommended), or design the Agent so re-runs are explicitly desired.

**Forgetting `virtual_model_id` for `kind: Agent`.** The Moon needs to know how to route `soya:<id>` requests to your pack. Validation will catch this, but it's a common stumble.

**SemVer pre-release accidentally promoted.** `0.1.0-alpha.0` is fine in staging; promote to `0.1.0` before flipping prod traffic. Comet treats `*-alpha.*` versions as "unstable, do not cache aggressively".

**Examples drift from inputs schema.** `pack lint` checks fixture files against the `inputs` JSON Schema. If you add a required field but forget to update fixtures, lint warns. `--strict` makes it fail.

## Validation

```bash
soyaos pack validate .
```

The validator is the same code Comet runs at admission time. CI for [soyaos/skills](https://github.com/soyaos/skills) calls it on every PR.

For deeper checks (examples coverage, narrowness of capabilities) use:

```bash
soyaos pack lint . --strict
```

## What's coming in v1?

v1 will **add** these fields (never remove or repurpose v0 ones):

- `secrets:` — declared, named, env-bound secrets with rotation policies.
- `sla:` — per-stage timeout / cost budget caps.
- `signed_by:` — cryptographic provenance, paired with `soyaos pack sign`.
- `compat:` — minimum runtime version, optional feature flags.

v0 packs will keep working unchanged when v1 ships.
