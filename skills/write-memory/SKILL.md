---
name: write-memory
description: >
  Save a fact, decision, or task outcome to the Paperclip agent memory store
  so it can be recalled in future sessions. Use after completing significant
  work, making non-obvious decisions, or resolving issues that could recur.
  The server also writes memory automatically when a hermes_local run succeeds
  and the enableAgentMemory flag is on — use this skill to add supplemental
  or more detailed entries. Requires the enableAgentMemory experimental flag.
---

# Write Memory

Persist a memory entry to the cross-session agent memory store.

## When to Use

- After completing a task, to record what was done and why
- After making a non-obvious technical decision that future-you should know
- To record blockers, resolutions, or patterns discovered during a run
- As a supplement to the automatic post-run memory written by the server

## API: Write Memory

```bash
curl -s -X POST \
  "$PAPERCLIP_API_URL/api/companies/$PAPERCLIP_COMPANY_ID/agents/$PAPERCLIP_AGENT_ID/memory" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "X-Paperclip-Run-Id: $PAPERCLIP_RUN_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "body": "Task BYG-7: Implemented agent memory layer. Used PostgreSQL tsvector GIN index for FTS. Flag: enableAgentMemory in experimental settings.",
    "sessionId": "'"$PAPERCLIP_RUN_ID"'",
    "embeddingHint": "BYG-7"
  }'
```

Fields:

| Field | Required | Max | Description |
|-------|----------|-----|-------------|
| `body` | ✅ | 10 000 chars | The memory content. Write in plain prose. |
| `sessionId` | ❌ | — | Run ID or session reference (use `$PAPERCLIP_RUN_ID`). |
| `embeddingHint` | ❌ | 500 chars | Short tag for future retrieval (e.g. issue ID, topic). |

## Guidelines

- **One fact per entry.** Short, dense entries search better than long walls of text.
- **Always include the task/issue ID** in `body` or `embeddingHint` for traceability.
- **Present tense descriptions** recall better than past tense (e.g. "Auth uses JWT HS256" not "I used JWT HS256").
- Check with `recall-memory` before writing to avoid exact duplicates.
- Do not store secrets, tokens, or user PII in memory entries.
