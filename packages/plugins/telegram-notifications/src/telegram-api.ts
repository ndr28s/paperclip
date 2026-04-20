/**
 * Minimal Telegram Bot API client.
 *
 * Handles MarkdownV2 escaping, 4096-char message splitting, plain-text
 * fallback on parse errors, and basic retry with retry_after support.
 */

const TELEGRAM_API = "https://api.telegram.org";
const MAX_LEN = 4096;
const SPLIT_AT = 4000;
const MAX_RETRIES = 3;

// Characters that must be escaped in MarkdownV2 outside code spans.
const MDV2_ESCAPE_RE = /([_*\[\]()~`>#+\-=|{}.!\\])/g;

export function escapeMarkdownV2(text: string): string {
  return text.replace(MDV2_ESCAPE_RE, "\\$1");
}

/**
 * Convert basic Markdown to Telegram MarkdownV2.
 * Protects fenced code blocks from escaping, converts headers to bold,
 * wraps pipe tables in code fences, and escapes remaining special chars.
 */
export function formatMarkdownV2(text: string): string {
  const codeBlocks: string[] = [];

  // Protect fenced code blocks.
  let safe = text.replace(/```[\s\S]*?```/g, (match) => {
    codeBlocks.push(match);
    return `\x00CODE${codeBlocks.length - 1}\x00`;
  });

  // ## Heading -> *bold*
  safe = safe.replace(/^#{1,6}\s+(.+)$/gm, (_, content: string) => `*${escapeMarkdownV2(content)}*`);

  // [text](url) -> [text](url)  (already valid MarkdownV2, just escape special chars in text)
  safe = safe.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, linkText: string, url: string) =>
    `[${escapeMarkdownV2(linkText)}](${url})`
  );

  // Pipe tables -> code fence (Telegram has no table support)
  safe = safe.replace(/(\|.+\|(\n|$))+/g, (match) => `\`\`\`\n${match}\`\`\``);

  // Escape remaining special characters (but not inside already-escaped sequences)
  safe = safe.replace(/(?<!\\)([_*\[\]()~`>#+\-=|{}.!\\])/g, "\\$1");

  // Restore code blocks (they must not be double-escaped).
  safe = safe.replace(/\x00CODE(\d+)\x00/g, (_, i: string) => codeBlocks[parseInt(i, 10)]);

  return safe;
}

/** Strip Markdown formatting for plain-text fallback. */
export function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, (m) => m.replace(/```/g, "").trim())
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*?([^*]+)\*\*?/g, "$1")
    .replace(/__?([^_]+)__?/g, "$1")
    .replace(/#{1,6}\s+/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^[>-]\s/gm, "");
}

/** Split text into ≤4096-char chunks on newline boundaries. */
function splitMessage(text: string): string[] {
  if (text.length <= SPLIT_AT) return [text];

  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > SPLIT_AT) {
    let cut = remaining.lastIndexOf("\n", SPLIT_AT);
    if (cut <= 0) cut = SPLIT_AT;
    chunks.push(remaining.slice(0, cut));
    remaining = remaining.slice(cut).trimStart();
  }
  if (remaining.length > 0) chunks.push(remaining);
  return chunks;
}

interface TelegramHttpClient {
  fetch(url: string, init?: RequestInit): Promise<Response>;
}

interface SendOptions {
  parseMode?: "MarkdownV2" | "HTML" | "Markdown";
  disableNotification?: boolean;
  replyToMessageId?: number;
}

export async function sendMessage(
  http: TelegramHttpClient,
  token: string,
  chatId: string,
  text: string,
  options: SendOptions = {}
): Promise<void> {
  const chunks = splitMessage(text);
  const total = chunks.length;

  for (let idx = 0; idx < chunks.length; idx++) {
    let chunk = chunks[idx];
    if (total > 1) {
      const suffix = escapeMarkdownV2(` (${idx + 1}/${total})`);
      chunk = chunk + `\n${suffix}`;
    }

    await _sendChunk(http, token, chatId, chunk, options);
  }
}

async function _sendChunk(
  http: TelegramHttpClient,
  token: string,
  chatId: string,
  text: string,
  options: SendOptions,
  attempt = 0
): Promise<void> {
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text: text.slice(0, MAX_LEN),
    parse_mode: options.parseMode ?? "MarkdownV2",
    disable_notification: options.disableNotification ?? false,
  };
  if (options.replyToMessageId) {
    body["reply_to_message_id"] = options.replyToMessageId;
  }

  const url = `${TELEGRAM_API}/bot${token}/sendMessage`;
  const res = await http.fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (res.ok) return;

  const errBody = await res.json().catch(() => ({})) as Record<string, unknown>;
  const description = (errBody["description"] as string) ?? "";

  // Flood control
  const retryAfter = (errBody["parameters"] as Record<string, unknown> | undefined)?.["retry_after"];
  if (res.status === 429 && typeof retryAfter === "number" && retryAfter <= 60 && attempt < MAX_RETRIES) {
    await sleep(retryAfter * 1000);
    return _sendChunk(http, token, chatId, text, options, attempt + 1);
  }

  // MarkdownV2 parse error → retry as plain text
  if (
    res.status === 400 &&
    description.toLowerCase().includes("can't parse") &&
    body["parse_mode"] !== undefined
  ) {
    return _sendChunk(
      http,
      token,
      chatId,
      stripMarkdown(text),
      { ...options, parseMode: undefined },
      attempt + 1
    );
  }

  // Transient server error
  if (res.status >= 500 && attempt < MAX_RETRIES) {
    await sleep(Math.min(5000 * 2 ** attempt, 60000));
    return _sendChunk(http, token, chatId, text, options, attempt + 1);
  }

  throw new Error(`Telegram sendMessage failed (${res.status}): ${description}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
