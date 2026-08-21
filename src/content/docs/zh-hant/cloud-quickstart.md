---
title: Cloud 快速上手
description: 五分鐘登入 SoyaOS Cloud、建立 API Key，並跑通第一個代管 Agent 情境。
order: 2
category: getting-started
---

這條路徑不需要安裝 SoyaOS，也不需要部署伺服器。你只需要 GitHub 帳號、瀏覽器和一個能執行 `curl` 的終端機，就能呼叫正式環境中的代管 Agent。

想在自己的電腦上執行 SoyaOS？請改看[本機 Solo 快速上手](/zh-hant/docs/quickstart)。Cloud v0.2.0 目前只開放平台審核的文字 Agent，不能上傳或執行自己的 SoyaPack、工具或任意程式碼。

## 跑通後你會得到什麼

你會把一段產品需求交給 `soya:starter`，讓它拆成三項今天可以完成的工作，然後在開發者入口網站裡用請求 ID 找到這次呼叫的 Trace。

整個過程通常不超過五分鐘：

1. 使用 GitHub 登入；
2. 建立一個 API Key；
3. 查詢可用模型；
4. 呼叫 `soya:starter`；
5. 用 `x-request-id` 核對用量和 Trace。

## 1. 登入開發者入口網站

開啟 [SoyaOS Developer Portal](https://developer.soyaos.ai/zh-hant)，點擊 **使用 GitHub 繼續**。首次登入會自動建立你的個人租戶，不需要填寫組織或付款資訊。

如果 GitHub 授權完成後仍回到登入頁，請先確認瀏覽器沒有封鎖 Cookie，再重試一次。服務狀態可以在 [status.soyaos.ai](https://status.soyaos.ai/zh-hant) 查看。

## 2. 建立 API Key

進入 [API 金鑰](https://developer.soyaos.ai/zh-hant/api-keys)，建立一個名為 `cloud-quickstart` 的 Key。

完整 Key 只顯示一次，格式類似：

```text
sk-soya-<key_id>.<secret>
```

立即儲存到密碼管理器。不要把 Key 放進原始碼、截圖、聊天訊息或 `.env` 範本；教學完成後不再使用時，可以回到同一頁撤銷。

在 macOS、Linux、WSL、Git Bash 或其他 Bash 相容終端機中，安全地讀入目前工作階段：

```bash
printf '貼上 SoyaOS API Key，然後按 Enter：'
IFS= read -r -s SOYA_API_KEY
printf '\n'
export SOYA_API_KEY
```

輸入不會顯示在螢幕上，變數只對目前終端機工作階段有效。

## 3. 查詢可用模型

先驗證 Key，並確認 `soya:starter` 目前可用：

```bash
curl -sS https://api.soyaos.ai/v1/models \
  -H "Authorization: Bearer ${SOYA_API_KEY}"
```

成功時回傳 `200`，JSON 的 `data` 陣列中至少包含：

```json
{
  "id": "soya:starter",
  "object": "model"
}
```

如果這裡回傳 `401`，先不要繼續：重新複製 Key、檢查前後沒有空格，並確認它沒有被撤銷。

## 4. 跑通第一個入門情境

下列請求讓 Agent 把一段產品需求拆成三個可執行工作。使用 `-i` 是為了同時看到回應標頭中的 `x-request-id`。

```bash
curl -i -sS https://api.soyaos.ai/v1/chat/completions \
  -H "Authorization: Bearer ${SOYA_API_KEY}" \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "soya:starter",
    "messages": [
      {
        "role": "user",
        "content": "我正在做一個個人記帳應用程式。請把這個需求拆成 3 個今天可以完成的開發工作：使用者可以輸入支出，並按月份查看彙總。"
      }
    ],
    "max_tokens": 256,
    "stream": false
  }'
```

成功時你會看到：

- HTTP 狀態為 `200`；
- 回應標頭包含 `x-request-id: ...`；
- `choices[0].message.content` 中有三項工作；
- `usage` 中有本次呼叫的輸入、輸出和總 token 數。

輸出措辭每次可能不同，但必須非空。複製 `x-request-id` 的值，下一步會用到。

## 5. 核對用量和 Trace

開啟 [用量與 Trace](https://developer.soyaos.ai/zh-hant/usage)，把剛才的 `x-request-id` 貼到請求 ID 篩選欄。正常情況下，你會看到對應模型、狀態碼、耗時和 token 數。

Trace 中繼資料最多保留 24 小時。SoyaOS 預設不把 prompt 和 response 內文寫入 D1 或請求 Trace，但請求內文會傳送給代管模型完成推理，因此不要提交密碼、金鑰、受監管資料或需要指定資料駐留區域的內容。

## 不寫程式也可以先試

想先確認帳號和 Key 是否正常，可以開啟[測試台](https://developer.soyaos.ai/zh-hant/playground)：貼上 Key、選擇 `soya:starter`、輸入同一段需求並執行。Portal 只會把 Key 傳送給 `api.soyaos.ai`，不會儲存它。

測試台適合手動試驗；接入應用程式時仍應使用上面的 OpenAI 相容 API。

## 目前免費額度與邊界

Cloud v0.2.0 目前免費、單區、best-effort、無 SLA。個人租戶的預設限制是：

| 限制 | 目前值 |
| --- | ---: |
| 每分鐘請求 | 20 |
| 同時進行中的請求 | 2 |
| 每日請求 | 100 |
| 每日總 token | 100,000 |
| 有效 API Key | 3 |
| Trace 保留 | 24 小時 |

每日額度在 `00:00 UTC` 重設。目前版本不支援計費、組織租戶、BYOK、自訂 SoyaPack、Tool Calls、MCP、圖片、音訊、檔案或任意程式碼執行。

## 常見錯誤

**`401`**——Key 缺失、複製不完整、已撤銷或環境變數沒有設定。重新執行第 2、3 步。

**`404`**——模型 ID 不存在。先呼叫 `/v1/models`，使用實際回傳的 `soya:*` ID。

**`429`**——達到每分鐘、並行、每日請求或 token 額度。查看 `Retry-After`，等待後重試；不要無間隔重複請求。

**`502` / `503`**——平台或代管模型暫時無法使用。保存 `x-request-id`，稍後重試，並查看[狀態頁](https://status.soyaos.ai/zh-hant)。

**沒有在用量頁看到 Trace**——確認登入的是建立該 Key 的同一個 GitHub 帳號，並等待幾秒後重新整理。跨租戶請求不會顯示。

## 清理

教學完成後，如果這個 Key 不會繼續用於開發：

1. 回到 [API 金鑰](https://developer.soyaos.ai/zh-hant/api-keys)；
2. 撤銷 `cloud-quickstart`；
3. 清除目前終端機變數：

```bash
unset SOYA_API_KEY
```

接下來可以閱讀 [HTTP API](/zh-hant/docs/http-api) 了解請求和錯誤合約，或在[開發者入口網站文件](https://developer.soyaos.ai/zh-hant/docs)查看 Cloud 控制面說明。
