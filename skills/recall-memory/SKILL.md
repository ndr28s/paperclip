---
name: recall-memory
description: >
  Search the Paperclip agent memory store to recall facts, past task outcomes,
  and context from previous sessions. Use when you need to remember what you
  did before, look up prior decisions, or retrieve context that was stored in
  earlier heartbeat runs. Requires the enableAgentMemory experimental flag to
  be active on the instance.
---

# Recall Memory

Search your persistent cross-session memory store via the Paperclip API.

## When to Use

- At the start of a heartbeat when working on a familiar task area
- Before making decisions that may have been resolved in a prior session
- When you need context about past outcomes for the current agent or task

## API: Search Memory

```bash
curl -s "$PAPERCLIP_API_URL/api/companies/$PAPERCLIP_COMPANY_ID/agents/$PAPERCLIP_AGENT_ID/memory/search?q=<query>&limit=10" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "X-Paperclip-Run-Id: $PAPERCLIP_RUN_ID"
```

- **`q`** — natural-language search query (required). Uses full-text search over stored memory bodies.
- **`limit`** — number of results, 1–50 (default 10).

Response:

```json
{
  "results": [
    {
      "id": "...",
      "agentId": "...",
      "sessionId": "...",
      "body": "Task BYG-5: Deployed new adapter, resolved auth issue with JWT expiry.",
      "embeddingHint": "BYG-5",
      "createdAt": "2026-04-18T10:22:00Z"
    }
  ]
}
```

## API: List Recent Memory

```bash
curl -s "$PAPERCLIP_API_URL/api/companies/$PAPERCLIP_COMPANY_ID/agents/$PAPERCLIP_AGENT_ID/memory?limit=5" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "X-Paperclip-Run-Id: $PAPERCLIP_RUN_ID"
```

## Guidelines

- Search before writing — avoid duplicate entries.
- Keep queries short and keyword-focused (e.g. `"JWT auth issue"`, `"BYG-5 deployment"`).
- If results are empty, the memory store may be new or the flag may be off — proceed without blocking.
- Never expose raw memory entries in public issue comments; summarize only.
