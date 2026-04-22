/**
 * Model-agnostic context compression service.
 *
 * Compresses a conversation history to fit within a token budget by
 * summarizing the compressible middle region with the auxiliary LLM,
 * while preserving protected head and tail turns for coherence.
 *
 * Three-region strategy:
 *   HEAD  — system prompt + first N turns (never compressed)
 *   MIDDLE — everything between head and tail (summarized by aux LLM)
 *   TAIL  — last M turns (never compressed, preserves recency)
 *
 * When no aux LLM is configured, falls back to dropping the middle turns
 * and inserting a placeholder, so the service is always usable.
 */

import type { AuxMessage } from "@paperclipai/adapter-utils";
import { callAuxLLM } from "@paperclipai/adapter-utils";

export type CompressionRole = "system" | "user" | "assistant" | "tool";

export interface ContextMessage {
  role: CompressionRole;
  content: string;
}

export interface CompressionOptions {
  /** The conversation history to compress. */
  messages: ContextMessage[];
  /**
   * Target token budget (soft limit). Compression is skipped when the
   * estimated token count is already within this budget.
   * Defaults to 80 000 tokens (~320 000 characters).
   */
  targetTokenBudget?: number;
  /**
   * Number of complete user+assistant exchange pairs to keep at the head
   * (beyond the system message). Defaults to 2.
   */
  protectedHeadTurns?: number;
  /**
   * Number of complete user+assistant exchange pairs to keep at the tail.
   * Defaults to 4.
   */
  protectedTailTurns?: number;
  /** Override the system prompt sent to the summary LLM. */
  summarySystemPrompt?: string;
  /** Timeout in ms for the summary LLM call. Defaults to 30 000. */
  timeoutMs?: number;
}

export interface CompressionResult {
  messages: ContextMessage[];
  originalTokenEstimate: number;
  compressedTokenEstimate: number;
  /** Ratio of compressed to original size (1.0 = no change, 0.5 = 50% reduction). */
  compressionRatio: number;
  didCompress: boolean;
  summaryModel?: string;
  summaryProvider?: string;
}

const CHARS_PER_TOKEN = 4;
const DEFAULT_TARGET_TOKEN_BUDGET = 80_000;
const DEFAULT_HEAD_TURNS = 2;
const DEFAULT_TAIL_TURNS = 4;
const DEFAULT_TIMEOUT_MS = 30_000;

const DEFAULT_SUMMARY_SYSTEM_PROMPT =
  "You are a conversation compressor. Given the following agent conversation excerpt, " +
  "produce a concise summary (1-3 paragraphs) that captures: what was attempted, what " +
  "succeeded or failed, key decisions made, and any file paths, identifiers, or data " +
  "values that will matter for future turns. Preserve technical accuracy. " +
  "Do not include conversational filler or repeat the original text verbatim.";

/**
 * Estimate token count from character length.
 * Rough heuristic: 1 token ≈ 4 characters (English prose / code mix).
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

function totalMessageTokens(messages: ContextMessage[]): number {
  return messages.reduce((sum, m) => sum + estimateTokens(m.content), 0);
}

/**
 * Identify which message indices belong to the protected head and tail.
 *
 * Head protection rules:
 *   - All leading system messages are always protected.
 *   - The first `protectedHeadTurns` user+assistant pairs after system messages.
 *
 * Tail protection rules:
 *   - The last `protectedTailTurns` user+assistant pairs.
 */
function findProtectedIndices(
  messages: ContextMessage[],
  protectedHeadTurns: number,
  protectedTailTurns: number,
): { headEnd: number; tailStart: number } {
  let headEnd = 0;

  // Advance past all leading system messages
  while (headEnd < messages.length && messages[headEnd]!.role === "system") {
    headEnd++;
  }

  // Protect the first N non-system turns
  let turnCount = 0;
  let i = headEnd;
  while (i < messages.length && turnCount < protectedHeadTurns) {
    const role = messages[i]!.role;
    if (role === "user" || role === "assistant") turnCount++;
    i++;
    if (role === "assistant") {
      // Count a full exchange when we've seen an assistant response
    }
  }
  headEnd = i;

  // Protect the last M non-system turns from the tail
  let tailTurnCount = 0;
  let j = messages.length - 1;
  while (j >= headEnd && tailTurnCount < protectedTailTurns) {
    const role = messages[j]!.role;
    if (role === "user" || role === "assistant") tailTurnCount++;
    j--;
  }
  const tailStart = Math.max(headEnd, j + 1);

  return { headEnd, tailStart };
}

function messagesToText(messages: ContextMessage[]): string {
  return messages
    .map((m) => `[${m.role.toUpperCase()}]\n${m.content}`)
    .join("\n\n---\n\n");
}

/**
 * Compress a conversation history to fit within a token budget.
 *
 * When the conversation is already within budget, returns the original
 * messages unchanged (no LLM call is made).
 *
 * When the aux LLM is unavailable, inserts a static placeholder for the
 * compressed region so the service always degrades gracefully.
 */
export async function compressContext(options: CompressionOptions): Promise<CompressionResult> {
  const {
    messages,
    targetTokenBudget = DEFAULT_TARGET_TOKEN_BUDGET,
    protectedHeadTurns = DEFAULT_HEAD_TURNS,
    protectedTailTurns = DEFAULT_TAIL_TURNS,
    summarySystemPrompt = DEFAULT_SUMMARY_SYSTEM_PROMPT,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = options;

  const originalTokenEstimate = totalMessageTokens(messages);

  // Nothing to do if already within budget
  if (originalTokenEstimate <= targetTokenBudget) {
    return {
      messages,
      originalTokenEstimate,
      compressedTokenEstimate: originalTokenEstimate,
      compressionRatio: 1,
      didCompress: false,
    };
  }

  // Need at least head + 1 middle + tail to compress anything meaningful
  if (messages.length < 3) {
    return {
      messages,
      originalTokenEstimate,
      compressedTokenEstimate: originalTokenEstimate,
      compressionRatio: 1,
      didCompress: false,
    };
  }

  const { headEnd, tailStart } = findProtectedIndices(messages, protectedHeadTurns, protectedTailTurns);

  // No middle region to compress
  if (headEnd >= tailStart) {
    return {
      messages,
      originalTokenEstimate,
      compressedTokenEstimate: originalTokenEstimate,
      compressionRatio: 1,
      didCompress: false,
    };
  }

  const head = messages.slice(0, headEnd);
  const middle = messages.slice(headEnd, tailStart);
  const tail = messages.slice(tailStart);

  const middleText = messagesToText(middle);

  // Attempt LLM summarization
  const auxMessages: AuxMessage[] = [
    { role: "system", content: summarySystemPrompt },
    {
      role: "user",
      content: `Summarize the following conversation excerpt:\n\n${middleText}`,
    },
  ];

  let summaryContent: string;
  let summaryModel: string | undefined;
  let summaryProvider: string | undefined;

  try {
    const result = await callAuxLLM({
      task: "compression",
      messages: auxMessages,
      maxTokens: 512,
      temperature: 0.2,
      timeoutMs,
    });

    if (result) {
      summaryContent = result.content;
      summaryModel = result.model;
      summaryProvider = result.provider;
    } else {
      // No aux LLM configured — static placeholder
      summaryContent = `[${middle.length} intermediate turns omitted — no summarization provider configured]`;
    }
  } catch {
    // Network/API error — static placeholder rather than crashing
    summaryContent = `[${middle.length} intermediate turns omitted due to summarization error]`;
  }

  const summaryMessage: ContextMessage = {
    role: "assistant",
    content: `[Context summary — ${middle.length} turns compressed]\n\n${summaryContent}`,
  };

  const compressed = [...head, summaryMessage, ...tail];
  const compressedTokenEstimate = totalMessageTokens(compressed);

  return {
    messages: compressed,
    originalTokenEstimate,
    compressedTokenEstimate,
    compressionRatio: compressedTokenEstimate / originalTokenEstimate,
    didCompress: true,
    ...(summaryModel ? { summaryModel } : {}),
    ...(summaryProvider ? { summaryProvider } : {}),
  };
}
