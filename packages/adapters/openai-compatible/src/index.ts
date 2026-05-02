export const type = "openai_compatible";
export const label = "OpenAI-compatible API";

export const DEFAULT_BASE_URL = "http://localhost:8000/v1";
export const DEFAULT_MODEL = "qwen3.6-35b";

export const models: Array<{ id: string; label: string }> = [];

export const agentConfigurationDoc = `# openai_compatible agent configuration

Adapter: openai_compatible

Calls any OpenAI-compatible REST API directly over HTTP from the Paperclip
server. No CLI tool is spawned; the adapter performs a single
\`POST {baseUrl}/chat/completions\` request per heartbeat.

Use when:
- You run a self-hosted inference server such as vLLM, Ollama, LM Studio,
  llama.cpp server, TGI, or any other OpenAI-compatible endpoint
- You want zero CLI dependencies on the Paperclip host

Don't use when:
- You need filesystem tools (read/edit/bash). This adapter has no tools and
  only returns the model's text response.

Core fields:
- baseUrl (string, required): OpenAI-compatible base URL (e.g. http://localhost:8000/v1)
- model (string, required): Model id served by the endpoint (e.g. qwen3.6-35b)
- apiKey (string, optional): bearer token sent as \`Authorization: Bearer ...\`
- promptTemplate (string, optional): user prompt template
- timeoutSec (number, optional): request timeout in seconds (default 120)
`;
