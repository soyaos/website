---
title: Writing an Agent from scratch
description: Build a multi-stage Agent that fetches a URL, extracts bullets, and emits a typed artifact.
order: 1
category: guides
---

This guide walks you through writing a real Agent — deeper than [Quickstart](../getting-started/quickstart.md)'s `echo` template. You'll build `research-summarizer`: it takes a URL, fetches the page, calls an upstream LLM to extract 5–10 bullet points, and emits a `summary.v1` artifact.

Five minutes if you copy-paste; 30 if you also internalize the *why* for each piece.

## What you'll learn

- How to wire up a `tools.fetch` capability against a narrow `egress` allowlist.
- How to compose two prompt stages (extract + summarize) so the LLM sees a clean second-pass prompt.
- How to type the output artifact and validate it.
- How to write fixtures so `pack lint` keeps you honest.

## 1. Scaffold

```bash
soyaos pack init research-summarizer --template chat
cd research-summarizer
```

The `chat` template gives you a single-stage Agent that calls an upstream LLM. We'll grow it into two stages and add a tool.

## 2. The manifest

Replace the generated `soyapack.yaml` with:

```yaml
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
    url:        { type: string, format: uri }
    max_bullets: { type: integer, default: 8, minimum: 3, maximum: 12 }

outputs:
  summary: summary.v1

prompts:
  extract:   prompts/extract.md
  summarize: prompts/summarize.md

tools:
  fetch:
    kind: builtin.http_get
    params: { timeout: 15s, max_bytes: 2_000_000 }

upstream:
  prefer: openai

examples:
  short_blog:
    input: { url: "https://example.com/post", max_bullets: 5 }
```

> Tool egress is the easy mistake. `builtin.http_get` honors the pack's `egress` allowlist — if you want to fetch from `example.com` you need to add it too. We've kept this manifest pinned to a single host so the example stays clean; in a real Agent you'd either add the destinations explicitly or proxy through the Moon.

## 3. The prompts

`prompts/extract.md` — pulls clean text out of the raw fetched HTML:

```markdown
You receive a single HTML document in `{{ fetched_html }}`.

Return ONLY the article body as plain text. Strip nav, header, footer,
ads, comments, and "related articles" widgets. Preserve paragraph breaks
as blank lines.

If the page is clearly not an article (login page, search result, 404),
emit exactly: `<<NON_ARTICLE>>` and nothing else.
```

`prompts/summarize.md` — takes the clean text and produces bullets:

```markdown
You are summarizing an article into {{ max_bullets }} bullet points.

# Article

{{ article_text }}

# Rules

- One claim per bullet. No padding.
- Lead with the strongest claim.
- If the article has a counter-thesis, include it as the last bullet
  prefixed with "Counter:".
- Output as a JSON array of strings. No markdown, no preamble.
```

## 4. The stage wiring

A new `pipeline.yaml` defines how the stages connect:

```yaml
# pipeline.yaml
stages:
  - name: extract
    when: always
    inputs:
      fetched_html: '{{ tools.fetch(url=inputs.url).body }}'
    on: prompts.extract
    output: article_text

  - name: summarize
    when: 'article_text != "<<NON_ARTICLE>>"'
    inputs:
      article_text: '{{ stages.extract.output }}'
      max_bullets:  '{{ inputs.max_bullets }}'
    on: prompts.summarize
    output: bullets
    parse_as: 'json:string[]'

outputs:
  summary:
    bullets: '{{ stages.summarize.output }}'
    source_url: '{{ inputs.url }}'
```

Notice:

- `tools.fetch(...)` is evaluated against the manifest's `tools:` block. The Comet checks the egress allowlist at call time.
- `when:` lets us skip the second stage if extraction returned the sentinel — saves an LLM call.
- `parse_as: 'json:string[]'` validates the LLM output is a JSON array of strings; a parse failure exits with code `2` and a `error` Scope event.

## 5. The example fixture

`examples/short_blog.json`:

```json
{
  "url": "https://example.com/post",
  "max_bullets": 5,
  "_expected_kind": "article"
}
```

`_expected_kind` is metadata for `pack lint` — it doesn't reach the Agent, but it lets `lint` warn you if `extract` returns `<<NON_ARTICLE>>` for an input you claimed should be an article.

## 6. Validate, lint, run

```bash
soyaos pack validate .
soyaos pack lint . --strict
soyaos run . --input @examples/short_blog.json
```

If everything's wired right:

```bash
▶ research-summarizer @0.1.0 · 2 stages · capabilities: egress[1]
  extract     ████████████  2.1s
  summarize   ████████████  3.4s
✓ run_018f3a · ok in 5.51s
{
  "summary": {
    "bullets": [
      "Distributed compaction beats vertical scaling once your write-heavy table crosses ~50M rows.",
      "Bloom filter false-positive rate compounds across levels — tune at level 0, not the leaf.",
      "Counter: tiered compaction wastes 2-3× disk during peak ingest."
    ],
    "source_url": "https://example.com/post"
  }
}
```

## 7. Iterate quickly

`soyaos run --watch .` re-runs the pack whenever you touch a prompt file. Combine with `--json | jq` to live-watch the Scope events:

```bash
soyaos --json run . --input @examples/short_blog.json --watch | \
  jq -c 'select(.kind == "llm_response") | {tokens: .completion_tokens, stage}'
```

## 8. Ship it

```bash
soyaos pack push . --moon https://stage.example.com
```

Then point a client at `stage.example.com/v1` and use `model: soya:research-summarizer`. When you're happy, mirror to prod:

```bash
soyaos pull --moon https://stage.example.com soya:research-summarizer@0.1.0
soyaos push --moon https://prod.example.com  soya:research-summarizer@0.1.0
```

## Where to read more

- [Capabilities & sandbox](../concepts/capabilities-sandbox.md) — what `egress`, `fs`, and `determinism_tier` actually enforce.
- [Virtual models & BYOK](../concepts/virtual-models.md) — how the `upstream:` block resolves.
- [SoyaPack v0 manifest](../reference/soyapack-v0.md) — every field.
- [Sign and publish a SoyaPack](./sign-and-publish.md) — once you're ready for prod.
