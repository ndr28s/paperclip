---
title: OpenAI-compatible
summary: Run agents against any OpenAI-compatible HTTP endpoint (vLLM, Ollama, LM Studio, llama.cpp server, TGI)
---

The `openai_compatible` adapter calls any OpenAI-compatible REST API directly over HTTP from the Paperclip server. There is no CLI subprocess: the adapter performs `POST {baseUrl}/chat/completions` with an agentic tool-calling loop, parses tool calls, runs Paperclip API tools, and feeds the results back into the next round.

Use this adapter when:

- You run a self-hosted inference server (vLLM, Ollama, LM Studio, llama.cpp server, TGI, etc.)
- You want zero CLI dependencies on the Paperclip host
- Your model supports OpenAI-style function calling (or you can fall back to text mode)

Don't use it when:

- You need filesystem tools (read/edit/bash). The adapter only exposes Paperclip API tools (issues, comments, approvals, agent memory). For filesystem work, use a CLI adapter (`claude_local`, `codex_local`, `opencode_local`).

## Configuration Fields

Set these via the agent's `adapterConfig` in the UI or API.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `baseUrl` | string | Yes | OpenAI-compatible base URL (e.g. `http://host.docker.internal:8000/v1`) |
| `model` | string | Yes | Model id served by the endpoint (e.g. `qwen3.6-35b`) |
| `apiKey` | string | No | Bearer token sent as `Authorization: Bearer ...`. Leave blank for unauthenticated local servers |
| `timeoutSec` | number | No | Request timeout in seconds (default `600`) |
| `temperature` | number | No | Sampling temperature 0–2 (default `0.7`) |
| `maxTokens` | number | No | Max tokens per response (`0` = let the server decide) |
| `maxToolRounds` | number | No | Max agentic tool rounds per heartbeat (default `10`) |
| `disableTools` | boolean | No | Skip the tool-calling loop and run as plain chat (default `false`) |
| `systemPrompt` | string | No | Override the default system prompt template |
| `promptTemplate` | string | No | Override the per-heartbeat user prompt template |

The server will also auto-inject the agent's role-default onboarding bundle (AGENTS.md / HEARTBEAT.md / SOUL.md / TOOLS.md for `ceo`, AGENTS.md for everyone else) into the system prompt because this adapter cannot materialize an instructions bundle on disk.

## Reference Setup: vLLM + Qwen3.6-35B-A3B-FP8

This is the configuration we run in production. Hardware: 2× RTX 4090 (24GB each), 48GB total VRAM.

### Start vLLM

`scripts/start-qwen-mode.sh`:

```bash
vllm serve Qwen/Qwen3.6-35B-A3B-FP8 \
  --host 0.0.0.0 --port 8000 \
  --tensor-parallel-size 2 \
  --gpu-memory-utilization 0.92 \
  --max-model-len 32768 \
  --max-num-seqs 16 \
  --served-model-name qwen3.6-35b \
  --disable-custom-all-reduce \
  --enforce-eager \
  --enable-auto-tool-choice \
  --tool-call-parser qwen3_xml
```

Why each flag:

| Flag | Reason |
|---|---|
| `--tensor-parallel-size 2` | Split the model across both GPUs |
| `--gpu-memory-utilization 0.92` | Reserve enough VRAM for KV cache while leaving headroom |
| `--max-model-len 32768` | Allow long heartbeat prompts (system bundle + issue body + comments + Past Experience). Bump to 24576 if 32K OOMs |
| `--max-num-seqs 16` | Cap concurrent sequences — agents are bursty, not high QPS |
| `--served-model-name qwen3.6-35b` | The id Paperclip's `adapterConfig.model` references |
| `--disable-custom-all-reduce` | More compatible TP path on consumer GPUs |
| `--enforce-eager` | Disables CUDA graphs (eager mode) — avoids capture failures with FP8/MoE |
| `--enable-auto-tool-choice` | Required by `tool_choice="auto"` in the chat completions request |
| `--tool-call-parser qwen3_xml` | Qwen3-specific XML tool format. For other models, use `hermes`, `llama3_json`, `mistral`, etc. (run `vllm serve --help=Frontend \| grep tool` for the full list) |

### Configure the Paperclip agent

Set the agent's `adapterConfig` to:

```json
{
  "baseUrl": "http://host.docker.internal:8000/v1",
  "model": "qwen3.6-35b"
}
```

`host.docker.internal` resolves to the host gateway because `docker/docker-compose.yml` declares `extra_hosts: ["host.docker.internal:host-gateway"]`. If you run Paperclip outside Docker, use `http://localhost:8000/v1`.

## Tool-call Parser Selection

vLLM ships parsers for many model families. Pick the one matching your model:

| Model family | Parser flag |
|---|---|
| Qwen3 (general) | `qwen3_xml` |
| Qwen3-Coder | `qwen3_coder` |
| Qwen2.5 / Hermes-style | `hermes` |
| Llama 3.x | `llama3_json` (or `llama4_pythonic` / `llama4_json` for 4) |
| Mistral / Mixtral | `mistral` |
| DeepSeek | `deepseek_v3` / `deepseek_v31` / `deepseek_v32` / `deepseek_v4` |
| Phi-4 | `phi4_mini_json` |
| Granite | `granite` / `granite-20b-fc` / `granite4` |

If your model doesn't support function calling, omit `--enable-auto-tool-choice` entirely and the openai_compatible adapter will fall back to plain chat (driven by `commit 9bb458aa`'s `tools_unsupported_fallback`). The agent loses its tools but the meeting/heartbeat text generation still works.

## Operational Notes

### KV cache and `--max-model-len`

The KV cache size scales linearly with `max-model-len × max-num-seqs × layers`. On 2×4090 with FP8 weights and `gpu-memory-utilization 0.92`, our profile lands at:

- `--max-model-len 4096` → ~17 GB VRAM total (very loose)
- `--max-model-len 32768` → ~22 GB / 24 GB per GPU (comfortable)
- `--max-model-len 65536` → likely OOM on this hardware

If 32K OOMs, fall back stepwise: `24576` → `16384` → `8192`.

### Speed

Qwen3.6-A3B is a 35B-total / 3B-active MoE. Decode TPS on this hardware is ~60–100 tps. A dense 70B model in the same VRAM (e.g. Llama 3.3 70B AWQ) would land at ~15–25 tps. For agent loops with 5–10 model calls per task, MoE wins.

### Reasoning preambles (`<think>`)

Qwen3 emits chain-of-thought wrapped in `<think>...</think>`. The Paperclip server strips both paired tags and orphan `</think>` preambles before posting to meeting chat. This is configured in `heartbeat.ts` and applies on the auto-save path.

## Troubleshooting

**`"auto" tool choice requires --enable-auto-tool-choice and --tool-call-parser to be set`**
The vLLM start command is missing those two flags. Add both and restart vLLM. The adapter will auto-fallback to text mode in the meantime so heartbeats don't hard-fail.

**`This model's maximum context length is N tokens. However, you requested 0 out of...`**
The KV budget set by `--max-model-len` is too small. Bump it (see `--max-model-len 32768` above).

**`Request timed out after 600s`**
Long generations on slow hardware. Either raise `timeoutSec` in the agent's `adapterConfig`, or shrink output (lower `maxTokens`, tighter prompt).

**`fetch failed` from inside the Docker container**
The container can't reach the host's vLLM. Confirm `extra_hosts: ["host.docker.internal:host-gateway"]` is set in `docker/docker-compose.yml`, and the host's vLLM is bound to `0.0.0.0` (not `127.0.0.1`).

**Tool calls land as plain text instead of `tool_calls` field**
Wrong `--tool-call-parser` for the model. Try alternatives from the table above. The adapter will keep falling back to text mode (logging `tools_unsupported_fallback`) until the parser matches.

## Stop / Restart

`scripts/stop-all.sh` (companion to `start-qwen-mode.sh`) sends SIGTERM via the saved pidfile and pkill's any orphan `vllm serve`. Restart:

```bash
bash scripts/stop-all.sh
bash scripts/start-qwen-mode.sh
# Wait ~1–3 min for model load, verify with:
curl -s http://localhost:8000/v1/models | jq '.data[].id'
```

## Related

- [Adapters overview](./overview.md) — how adapters fit into Paperclip
- [Creating an adapter](./creating-an-adapter.md) — building your own
- [Docker deployment](../deploy/docker.md) — `extra_hosts`, environment variables
