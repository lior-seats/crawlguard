import type { FastifyInstance } from "fastify";
import { v4 as uuidv4 } from "uuid";
import { db } from "../db/client.js";
import { users, magicLinkTokens } from "../db/schema.js";
import { setSession, clearSession } from "../services/session.js";
import { publicLayout, escHtml } from "../templates/layout.js";
import { eq, and, gt, isNull } from "drizzle-orm";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
// Resend's shared onboarding domain — no DNS verification needed for MVP.
// Replace with a verified domain (e.g. noreply@crawlguard.dev) once DNS is set up.
const FROM_EMAIL = process.env.FROM_EMAIL ?? "CrawlGuard <onboarding@resend.dev>";

export async function authRoutes(app: FastifyInstance) {
  // GET /auth/login — login page
  app.get("/auth/login", async (req, reply) => {
    const flash = (req.query as Record<string, string>).flash;
    return reply.type("text/html").send(
      publicLayout(
        "Sign in",
        `<form method="POST" action="/auth/request">
          <input type="email" name="email" placeholder="you@example.com" required autofocus />
          <button type="submit">Send magic link</button>
          <p class="hint">No password needed — we'll email you a link.</p>
        </form>`,
        flash
      )
    );
  });

  // POST /auth/request — send magic link
  app.post("/auth/request", async (req, reply) => {
    const { email } = req.body as { email?: string };
    if (!email || !email.includes("@")) {
      return reply.redirect("/auth/login?flash=" + encodeURIComponent("Error: Please enter a valid email address."));
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Find or create user
    let user = await db.query.users.findFirst({
      where: eq(users.email, normalizedEmail),
    });

    if (!user) {
      const [created] = await db.insert(users).values({ email: normalizedEmail }).returning();
      user = created;
    }

    // Create token (15 min expiry)
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await db.insert(magicLinkTokens).values({
      userId: user.id,
      token,
      expiresAt,
    });

    const magicLink = `${BASE_URL}/auth/verify?token=${token}`;

    // Send email
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: normalizedEmail,
        subject: "Your CrawlGuard login link",
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2 style="color: #0d1117;">Sign in to CrawlGuard</h2>
            <p style="color: #333; margin: 16px 0;">Click the link below to sign in. This link expires in 15 minutes.</p>
            <a href="${magicLink}" style="
              display: inline-block;
              background: #58a6ff;
              color: #0d1117;
              text-decoration: none;
              padding: 12px 24px;
              border-radius: 6px;
              font-weight: 600;
              margin: 8px 0;
            ">Sign in to CrawlGuard</a>
            <p style="color: #666; font-size: 12px; margin-top: 20px;">
              Or copy this URL: ${magicLink}
            </p>
            <p style="color: #999; font-size: 12px; margin-top: 16px;">
              If you didn't request this, you can safely ignore this email.
            </p>
          </div>
        `,
      });
    } catch (err) {
      console.error("Failed to send magic link email:", err);
      // In dev, log the link so we can still test
      console.log("MAGIC LINK (dev fallback):", magicLink);
    }

    const successPage = publicLayout(
      "Check your email",
      `<div style="text-align:center;">
        <div style="font-size:40px; margin-bottom:16px;">📬</div>
        <h2 style="margin-bottom:8px;">Check your inbox</h2>
        <p style="color: var(--muted);">We sent a magic link to <strong>${escHtml(normalizedEmail)}</strong>.</p>
        <p style="color: var(--muted); margin-top:8px; font-size:12px;">The link expires in 15 minutes.</p>
      </div>`
    );

    return reply.type("text/html").send(successPage);
  });

  // GET /auth/verify?token=xxx — consume token, set cookie
  app.get("/auth/verify", async (req, reply) => {
    const { token } = req.query as { token?: string };
    if (!token) {
      return reply.redirect("/auth/login?flash=" + encodeURIComponent("Error: Invalid or missing token."));
    }

    const now = new Date();
    const record = await db.query.magicLinkTokens.findFirst({
      where: and(
        eq(magicLinkTokens.token, token),
        gt(magicLinkTokens.expiresAt, now),
        isNull(magicLinkTokens.usedAt)
      ),
    });

    if (!record) {
      return reply.redirect(
        "/auth/login?flash=" + encodeURIComponent("Error: Link is expired or already used. Request a new one.")
      );
    }

    // Mark token as used
    await db
      .update(magicLinkTokens)
      .set({ usedAt: now })
      .where(eq(magicLinkTokens.id, record.id));

    // Set session cookie
    setSession(reply, record.userId);
    return reply.redirect("/dashboard");
  });

  // GET /auth/logout
  app.get("/auth/logout", async (req, reply) => {
    clearSession(reply);
    return reply.redirect("/auth/login");
  });
}
