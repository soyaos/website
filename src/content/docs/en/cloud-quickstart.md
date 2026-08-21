---
title: Cloud quickstart
description: Sign in to SoyaOS Cloud, create an API key, and run your first hosted Agent scenario in five minutes.
order: 2
category: getting-started
---

This path requires no SoyaOS installation and no server deployment. All you need is a GitHub account, a browser, and a terminal with `curl` to call a hosted Agent in production.

Want to run SoyaOS on your own computer? Follow the [local Solo quickstart](/en/docs/quickstart) instead. Cloud v0.2.0 currently exposes platform-reviewed text Agents only; you cannot upload or run your own SoyaPack, tools, or arbitrary code.

## What you will accomplish

You will give `soya:starter` a short product requirement, ask it to split the requirement into three tasks you can finish today, and then find that call in the Developer Portal by its request ID.

The complete path normally takes less than five minutes:

1. Sign in with GitHub;
2. Create an API key;
3. List the available models;
4. Call `soya:starter`;
5. Verify usage and trace metadata with `x-request-id`.

## 1. Sign in to the Developer Portal

Open the [SoyaOS Developer Portal](https://developer.soyaos.ai/en) and click **Continue with GitHub**. Your first sign-in automatically creates a personal tenant; no organization or payment details are required.

If GitHub authorization returns you to the sign-in page, make sure your browser is not blocking cookies and try once more. You can check service health at [status.soyaos.ai](https://status.soyaos.ai/en).

## 2. Create an API key

Open [API keys](https://developer.soyaos.ai/en/api-keys) and create a key named `cloud-quickstart`.

The complete key is displayed once and looks like this:

```text
sk-soya-<key_id>.<secret>
```

Save it in a password manager immediately. Do not put the key in source code, screenshots, chat messages, or an `.env` template. You can revoke it from the same page when you no longer need it.

On macOS, Linux, WSL, Git Bash, or another Bash-compatible terminal, read it securely into the current session:

```bash
printf 'Paste your SoyaOS API key, then press Enter: '
IFS= read -r -s SOYA_API_KEY
printf '\n'
export SOYA_API_KEY
```

The input is not echoed to the screen, and the variable exists only in this terminal session.

## 3. List the available models

Verify the key and make sure `soya:starter` is available:

```bash
curl -sS https://api.soyaos.ai/v1/models \
  -H "Authorization: Bearer ${SOYA_API_KEY}"
```

A successful request returns `200`. The JSON `data` array contains at least:

```json
{
  "id": "soya:starter",
  "object": "model"
}
```

If this request returns `401`, stop here: copy the key again, remove any leading or trailing spaces, and make sure it has not been revoked.

## 4. Run your first scenario

The request below asks the Agent to turn a product requirement into three actionable tasks. The `-i` option displays the `x-request-id` response header along with the JSON body.

```bash
curl -i -sS https://api.soyaos.ai/v1/chat/completions \
  -H "Authorization: Bearer ${SOYA_API_KEY}" \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "soya:starter",
    "messages": [
      {
        "role": "user",
        "content": "I am building a personal expense tracker. Split this requirement into 3 development tasks I can finish today: a user can record an expense and view monthly totals."
      }
    ],
    "max_tokens": 256,
    "stream": false
  }'
```

A successful response has:

- HTTP status `200`;
- an `x-request-id: ...` response header;
- three tasks in `choices[0].message.content`;
- non-negative input, output, and total token counts in `usage`.

The wording may change between calls, but the content must not be empty. Copy the `x-request-id` value for the next step.

## 5. Verify usage and trace metadata

Open [Usage and traces](https://developer.soyaos.ai/en/usage) and paste the `x-request-id` into the request ID filter. You should see the matching model, status code, duration, and token counts.

Trace metadata is retained for up to 24 hours. SoyaOS does not persist prompt or response bodies in D1 or request traces by default, but request bodies are sent to the hosted model for inference. Do not submit passwords, keys, regulated data, or content that requires a guaranteed residency region.

## Try it without writing code

To check your account and key before using the API, open the [Playground](https://developer.soyaos.ai/en/playground), paste the key, select `soya:starter`, enter the same requirement, and run it. The Portal sends the key only to `api.soyaos.ai` and does not save it.

The Playground is useful for manual experiments. Use the OpenAI-compatible API above when integrating an application.

## Current free quota and boundaries

Cloud v0.2.0 is currently free, single-region, best-effort, and has no SLA. A personal tenant has these default limits:

| Limit | Current value |
| --- | ---: |
| Requests per minute | 20 |
| Concurrent requests | 2 |
| Requests per day | 100 |
| Total tokens per day | 100,000 |
| Active API keys | 3 |
| Trace retention | 24 hours |

Daily quotas reset at `00:00 UTC`. The current release does not support billing, organization tenants, BYOK, custom SoyaPacks, Tool Calls, MCP, images, audio, files, or arbitrary code execution.

## Common errors

**`401`** — The key is missing, incomplete, revoked, or absent from the environment. Repeat steps 2 and 3.

**`404`** — The model ID does not exist. Call `/v1/models` first and use a returned `soya:*` ID.

**`429`** — You reached a per-minute, concurrency, daily request, or token limit. Honor `Retry-After`; do not retry in a tight loop.

**`502` / `503`** — The platform or hosted model is temporarily unavailable. Save the `x-request-id`, retry later, and check the [status page](https://status.soyaos.ai/en).

**The trace is missing from Usage** — Make sure you signed in with the same GitHub account that created the key, wait a few seconds, and refresh. Cross-tenant requests are never shown.

## Clean up

If you will not keep using this key after the tutorial:

1. Return to [API keys](https://developer.soyaos.ai/en/api-keys);
2. Revoke `cloud-quickstart`;
3. Clear the terminal variable:

```bash
unset SOYA_API_KEY
```

Next, read the [HTTP API reference](/en/docs/http-api) for the request and error contracts, or visit the [Developer Portal docs](https://developer.soyaos.ai/en/docs) for Cloud control-plane details.
