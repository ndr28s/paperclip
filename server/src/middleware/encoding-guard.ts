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

export function encodingGuard(req: Request, res: Response, next: NextFunction) {
  if (req.body && typeof req.body === "object" && containsReplacementChar(req.body)) {
    logger.warn(
      {
        method: req.method,
        path: req.path,
        agentId: (req as any).actor?.agentId ?? null,
      },
      "request body contains U+FFFD — rejecting to prevent corrupted content storage (client sent non-UTF-8 bytes)",
    );
    // Reject instead of allowing through: storing U+FFFD replacement characters
    // silently corrupts multi-byte content (Korean, emoji, etc.) in the database.
    // On Windows, use the PAPERCLIP_POST_JSON env var with Python to send UTF-8:
    //   python3 << 'EOF'
    //   import json, urllib.request, os
    //   body = json.dumps({"key": "값"}).encode("ascii")  # ensure_ascii=True → pure ASCII
    //   req = urllib.request.Request(os.environ["PAPERCLIP_API_URL"] + "/api/path",
    //       data=body, method="POST",
    //       headers={"Content-Type": "application/json",
    //                "Authorization": "Bearer " + os.environ["PAPERCLIP_API_KEY"],
    //                "X-Paperclip-Run-Id": os.environ.get("PAPERCLIP_RUN_ID", "")})
    //   import urllib.error
    //   try: print(urllib.request.urlopen(req).read().decode("utf-8"))
    //   except urllib.error.HTTPError as e: print(e.read().decode("utf-8")); raise
    //   EOF
    res.status(400).json({
      error: "invalid_encoding",
      message:
        "Request body contains U+FFFD replacement characters, indicating the payload was not sent as valid UTF-8. " +
        "On Windows, avoid passing multi-byte text (Korean, emoji) as curl arguments — " +
        "use the PAPERCLIP_POST_JSON environment variable with a Python heredoc instead: " +
        "generate the JSON body with json.dumps(...) (ensure_ascii=True by default), encode as ASCII, " +
        "then POST via urllib.request.Request.",
    });
    return;
  }
  next();
}
