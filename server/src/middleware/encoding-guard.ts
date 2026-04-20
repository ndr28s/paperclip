import type { Request, Response, NextFunction } from "express";
import { logger } from "./logger.js";

const REPLACEMENT_CHAR = "\uFFFD";

function containsReplacementChar(val: unknown, depth = 0): boolean {
  if (depth > 8) return false;
  if (typeof val === "string") return val.includes(REPLACEMENT_CHAR);
  if (Array.isArray(val)) return val.some((v) => containsReplacementChar(v, depth + 1));
  if (val !== null && typeof val === "object") {
    return Object.values(val).some((v) => containsReplacementChar(v, depth + 1));
  }
  return false;
}

export function encodingGuard(req: Request, _res: Response, next: NextFunction) {
  if (req.body && typeof req.body === "object" && containsReplacementChar(req.body)) {
    logger.warn(
      {
        method: req.method,
        path: req.path,
        agentId: (req as any).actor?.agentId ?? null,
      },
      "request body contains U+FFFD — client likely sent CP949 bytes as UTF-8; store allowed but content may be corrupted",
    );
  }
  next();
}
