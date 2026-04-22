import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { callAuxLLM } from "../lib/auxiliary-client.js";
import {
  compressContext,
  estimateTokens,
  type ContextMessage,
} from "../lib/context-compression.js";

vi.mock("../lib/auxiliary-client.js", () => ({
  callAuxLLM: vi.fn(),
}));

// ── helpers ──────────────────────────────────────────────────────────────────

function msg(role: ContextMessage["role"], content: string): ContextMessage {
  return { role, content };
}

/** Build a fake conversation of N user+assistant pairs after a system message. */
function buildConversation(turns: number, wordsPerTurn = 50): ContextMessage[] {
  const messages: ContextMessage[] = [msg("system", "You are a helpful assistant.")];
  for (let i = 0; i < turns; i++) {
    messages.push(msg("user", `${"question ".repeat(wordsPerTurn)}turn ${i}`));
    messages.push(msg("assistant", `${"answer ".repeat(wordsPerTurn)}turn ${i}`));
  }
  return messages;
}

beforeEach(() => {
  vi.mocked(callAuxLLM).mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── estimateTokens ────────────────────────────────────────────────────────────

describe("estimateTokens", () => {
  it("returns 0 for empty string", () => {
    expect(estimateTokens("")).toBe(0);
  });

  it("estimates 1 token per 4 characters (ceiling)", () => {
    expect(estimateTokens("abcd")).toBe(1);    // 4 chars → 1 token
    expect(estimateTokens("abcde")).toBe(2);   // 5 chars → 2 tokens (ceil)
    expect(estimateTokens("a".repeat(100))).toBe(25); // 100 chars → 25 tokens
  });
});

// ── short-circuit: already within budget ─────────────────────────────────────

describe("compressContext — no compression needed", () => {
  it("returns original messages unchanged when within budget", async () => {
    const messages = buildConversation(2, 5);
    const result = await compressContext({ messages, targetTokenBudget: 100_000 });

    expect(result.didCompress).toBe(false);
    expect(result.messages).toBe(messages); // exact same reference
    expect(result.compressionRatio).toBe(1);
    expect(result.originalTokenEstimate).toBe(result.compressedTokenEstimate);
    expect(callAuxLLM).not.toHaveBeenCalled();
  });

  it("skips compression for very short conversations even over budget", async () => {
    const messages = [
      msg("system", "sys"),
      msg("user", "hi"),
    ];
    const result = await compressContext({ messages, targetTokenBudget: 0 });
    expect(result.didCompress).toBe(false);
    expect(result.messages).toBe(messages);
    expect(callAuxLLM).not.toHaveBeenCalled();
  });
});

// ── protected region boundaries ──────────────────────────────────────────────

describe("compressContext — protected regions", () => {
  it("does not compress when head+tail covers entire conversation", async () => {
    // 4 turns total, head=4 tail=4 → no middle
    const messages = buildConversation(4, 1);
    const result = await compressContext({
      messages,
      targetTokenBudget: 0,
      protectedHeadTurns: 4,
      protectedTailTurns: 4,
    });
    expect(result.didCompress).toBe(false);
    expect(callAuxLLM).not.toHaveBeenCalled();
  });

  it("system messages are always in the head", async () => {
    vi.mocked(callAuxLLM).mockResolvedValue({
      content: "summary",
      model: "m",
      provider: "openrouter",
    });

    const messages = [
      msg("system", "system message one"),
      msg("system", "system message two"),
      msg("user", "hello"),
      msg("assistant", "world"),
      msg("user", "more content ".repeat(200)),
      msg("assistant", "response ".repeat(200)),
    ];

    const result = await compressContext({
      messages,
      targetTokenBudget: 0,
      protectedHeadTurns: 1,
      protectedTailTurns: 1,
    });

    // Both system messages must appear in output
    const systemMessages = result.messages.filter((m) => m.role === "system");
    expect(systemMessages.length).toBe(2);
  });
});

// ── LLM summarization path ────────────────────────────────────────────────────

describe("compressContext — with aux LLM", () => {
  it("calls aux LLM and embeds summary in result", async () => {
    vi.mocked(callAuxLLM).mockResolvedValue({
      content: "The agent fixed three bugs.",
      model: "gpt-4o-mini",
      provider: "openai",
    });

    const messages = buildConversation(10, 40);
    const result = await compressContext({
      messages,
      targetTokenBudget: 0,
      protectedHeadTurns: 2,
      protectedTailTurns: 2,
    });

    expect(result.didCompress).toBe(true);
    expect(result.summaryModel).toBe("gpt-4o-mini");
    expect(result.summaryProvider).toBe("openai");
    expect(callAuxLLM).toHaveBeenCalledOnce();

    const summaryMsg = result.messages.find((m) => m.content.includes("The agent fixed three bugs."));
    expect(summaryMsg).toBeDefined();
  });

  it("compressed result is smaller than original", async () => {
    vi.mocked(callAuxLLM).mockResolvedValue({
      content: "short summary",
      model: "m",
      provider: "openrouter",
    });

    const messages = buildConversation(20, 100);
    const result = await compressContext({ messages, targetTokenBudget: 0 });

    expect(result.compressedTokenEstimate).toBeLessThan(result.originalTokenEstimate);
    expect(result.compressionRatio).toBeLessThan(1);
  });

  it("passes compression task type to callAuxLLM", async () => {
    vi.mocked(callAuxLLM).mockResolvedValue({
      content: "summary",
      model: "m",
      provider: "openrouter",
    });

    const messages = buildConversation(8, 30);
    await compressContext({ messages, targetTokenBudget: 0 });

    expect(callAuxLLM).toHaveBeenCalledWith(
      expect.objectContaining({ task: "compression" }),
    );
  });

  it("uses custom summarySystemPrompt when provided", async () => {
    vi.mocked(callAuxLLM).mockResolvedValue({
      content: "custom summary",
      model: "m",
      provider: "openrouter",
    });

    const messages = buildConversation(8, 30);
    const customPrompt = "Custom compression instructions.";
    await compressContext({ messages, targetTokenBudget: 0, summarySystemPrompt: customPrompt });

    const call = vi.mocked(callAuxLLM).mock.calls[0]![0];
    const systemMsg = call.messages.find((m: { role: string }) => m.role === "system");
    expect(systemMsg?.content).toBe(customPrompt);
  });
});

// ── no-LLM fallback ───────────────────────────────────────────────────────────

describe("compressContext — fallback when aux LLM unavailable", () => {
  it("inserts placeholder when callAuxLLM returns null", async () => {
    vi.mocked(callAuxLLM).mockResolvedValue(null);

    const messages = buildConversation(10, 30);
    const result = await compressContext({ messages, targetTokenBudget: 0 });

    expect(result.didCompress).toBe(true);
    const placeholder = result.messages.find((m) => m.content.includes("omitted"));
    expect(placeholder).toBeDefined();
    expect(result.summaryModel).toBeUndefined();
    expect(result.summaryProvider).toBeUndefined();
  });

  it("inserts error placeholder when callAuxLLM throws", async () => {
    vi.mocked(callAuxLLM).mockRejectedValue(new Error("network error"));

    const messages = buildConversation(10, 30);
    const result = await compressContext({ messages, targetTokenBudget: 0 });

    expect(result.didCompress).toBe(true);
    const placeholder = result.messages.find(
      (m) => m.content.includes("omitted due to summarization error"),
    );
    expect(placeholder).toBeDefined();
  });
});

// ── output structure invariants ───────────────────────────────────────────────

describe("compressContext — output structure", () => {
  it("always starts with system message when present", async () => {
    vi.mocked(callAuxLLM).mockResolvedValue({ content: "s", model: "m", provider: "openrouter" });

    const messages = buildConversation(10, 30);
    const result = await compressContext({ messages, targetTokenBudget: 0 });

    expect(result.messages[0]!.role).toBe("system");
  });

  it("tail turns appear at end in original order", async () => {
    vi.mocked(callAuxLLM).mockResolvedValue({ content: "s", model: "m", provider: "openrouter" });

    const messages = buildConversation(10, 30);
    // protectedTailTurns counts individual user/assistant messages (not pairs)
    const tailTurns = 4;
    const result = await compressContext({
      messages,
      targetTokenBudget: 0,
      protectedHeadTurns: 2,
      protectedTailTurns: tailTurns,
    });

    // Last tailTurns messages should match original tail (individual message count)
    const expectedTail = messages.slice(messages.length - tailTurns);
    const actualTail = result.messages.slice(result.messages.length - tailTurns);

    for (let i = 0; i < expectedTail.length; i++) {
      expect(actualTail[i]!.role).toBe(expectedTail[i]!.role);
      expect(actualTail[i]!.content).toBe(expectedTail[i]!.content);
    }
  });

  it("compressionRatio is between 0 and 1 exclusive for successful compression", async () => {
    vi.mocked(callAuxLLM).mockResolvedValue({ content: "short", model: "m", provider: "openrouter" });

    const messages = buildConversation(15, 100);
    const result = await compressContext({ messages, targetTokenBudget: 0 });

    expect(result.compressionRatio).toBeGreaterThan(0);
    expect(result.compressionRatio).toBeLessThan(1);
  });
});
