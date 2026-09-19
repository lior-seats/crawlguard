/**
 * Simple HMAC-signed session cookie.
 * No external store — userId is encoded in the cookie value.
 */
import { createHmac, timingSafeEqual } from "crypto";
import type { FastifyRequest, FastifyReply } from "fastify";

const SECRET = process.env.SESSION_SECRET ?? "dev-secret-change-me";
const COOKIE_NAME = "cg_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function sign(payload: string): string {
  const sig = createHmac("sha256", SECRET).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

function verify(value: string): string | null {
  const lastDot = value.lastIndexOf(".");
  if (lastDot === -1) return null;
  const payload = value.slice(0, lastDot);
  const expected = sign(payload);
  try {
    if (timingSafeEqual(Buffer.from(value), Buffer.from(expected))) {
      return payload;
    }
  } catch {
    // length mismatch — fall through
  }
  return null;
}

export function setSession(reply: FastifyReply, userId: string): void {
  const value = sign(userId);
  reply.setCookie(COOKIE_NAME, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export function clearSession(reply: FastifyReply): void {
  reply.clearCookie(COOKIE_NAME, { path: "/" });
}

export function getSessionUserId(request: FastifyRequest): string | null {
  const raw = request.cookies?.[COOKIE_NAME];
  if (!raw) return null;
  return verify(raw);
}
