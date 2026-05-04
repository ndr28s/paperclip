import { Router } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "@paperclipai/db";
import { authUsers } from "@paperclipai/db";
import {
  authSessionSchema,
  currentUserProfileSchema,
  updateCurrentUserProfileSchema,
} from "@paperclipai/shared";
import type { BetterAuthInstance } from "../auth/better-auth.js";
import { unauthorized } from "../errors.js";
import { validate } from "../middleware/validate.js";

// Username-only signup: no email collected from the client. The server
// synthesises an internal email so better-auth's email/password adapter
// (which still owns user creation under the hood) can persist the row.
const signUpUsernameSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3)
    .max(32)
    .regex(/^[a-zA-Z0-9_.]+$/, "Username must contain only letters, digits, '_' or '.'"),
  password: z.string().min(8),
  name: z.string().trim().min(1).max(120).optional(),
});

function synthesizeEmailFromUsername(username: string): string {
  return `${username.toLowerCase()}@paperclip.local`;
}

function copyAuthHeadersToExpress(headers: Headers, res: import("express").Response) {
  // Cookies (Set-Cookie) and any other auth-related headers must be forwarded
  // verbatim so the browser session sticks.
  for (const [key, value] of headers.entries()) {
    if (key.toLowerCase() === "set-cookie") {
      res.append("Set-Cookie", value);
    } else if (!res.getHeader(key)) {
      res.setHeader(key, value);
    }
  }
}

async function loadCurrentUserProfile(db: Db, userId: string) {
  const user = await db
    .select({
      id: authUsers.id,
      email: authUsers.email,
      username: authUsers.username,
      displayUsername: authUsers.displayUsername,
      name: authUsers.name,
      image: authUsers.image,
    })
    .from(authUsers)
    .where(eq(authUsers.id, userId))
    .then((rows) => rows[0] ?? null);

  if (!user) {
    throw unauthorized("Signed-in user not found");
  }

  return currentUserProfileSchema.parse({
    id: user.id,
    email: user.email ?? null,
    username: user.username ?? null,
    displayUsername: user.displayUsername ?? null,
    name: user.name ?? null,
    image: user.image ?? null,
  });
}

export function authRoutes(db: Db, auth?: BetterAuthInstance) {
  const router = Router();

  // /auth/lookup-by-username was removed: better-auth's `username` plugin
  // owns username → user resolution natively via POST /auth/sign-in/username.

  // Custom username-only signup. Wraps better-auth's signUpEmail with a
  // synthesised email so callers never see/handle email at all.
  router.post("/sign-up-username", validate(signUpUsernameSchema), async (req, res) => {
    if (!auth) {
      res.status(503).json({ error: "Auth is not configured on this deployment" });
      return;
    }
    const { username, password, name } = req.body as z.infer<typeof signUpUsernameSchema>;
    const email = synthesizeEmailFromUsername(username);
    try {
      // Cast: better-auth's static type for `body` doesn't know about the
      // `username` field that the plugin reads via a /sign-up/email hook,
      // and the `asResponse: true` overload return type isn't inferred.
      const upstream = (await auth.api.signUpEmail({
        body: {
          email,
          password,
          name: name ?? username,
          username,
        },
        headers: new Headers(req.headers as Record<string, string>),
        asResponse: true,
      } as Parameters<typeof auth.api.signUpEmail>[0])) as unknown as Response;
      copyAuthHeadersToExpress(upstream.headers, res);
      res.status(upstream.status);
      const text = await upstream.text();
      res.send(text);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Signup failed";
      const status = (err as { status?: number }).status ?? 400;
      res.status(status).json({ error: message });
    }
  });

  router.get("/get-session", async (req, res) => {
    if (req.actor.type !== "board" || !req.actor.userId) {
      throw unauthorized("Board authentication required");
    }

    const user = await loadCurrentUserProfile(db, req.actor.userId);
    res.json(authSessionSchema.parse({
      session: {
        id: `paperclip:${req.actor.source ?? "none"}:${req.actor.userId}`,
        userId: req.actor.userId,
      },
      user,
    }));
  });

  router.get("/profile", async (req, res) => {
    if (req.actor.type !== "board" || !req.actor.userId) {
      throw unauthorized("Board authentication required");
    }

    res.json(await loadCurrentUserProfile(db, req.actor.userId));
  });

  router.patch("/profile", validate(updateCurrentUserProfileSchema), async (req, res) => {
    if (req.actor.type !== "board" || !req.actor.userId) {
      throw unauthorized("Board authentication required");
    }

    const patch = updateCurrentUserProfileSchema.parse(req.body);
    const now = new Date();

    const updated = await db
      .update(authUsers)
      .set({
        name: patch.name,
        ...(patch.image !== undefined ? { image: patch.image } : {}),
        updatedAt: now,
      })
      .where(eq(authUsers.id, req.actor.userId))
      .returning({
        id: authUsers.id,
        email: authUsers.email,
        username: authUsers.username,
        displayUsername: authUsers.displayUsername,
        name: authUsers.name,
        image: authUsers.image,
      })
      .then((rows) => rows[0] ?? null);

    if (!updated) {
      throw unauthorized("Signed-in user not found");
    }

    res.json(currentUserProfileSchema.parse({
      id: updated.id,
      email: updated.email ?? null,
      username: updated.username ?? null,
      displayUsername: updated.displayUsername ?? null,
      name: updated.name ?? null,
      image: updated.image ?? null,
    }));
  });

  return router;
}
