import Fastify from "fastify";
import cookie from "@fastify/cookie";
import formbody from "@fastify/formbody";
import { authRoutes } from "./routes/auth.js";
import { drainRoutes } from "./routes/drain.js";
import { dashboardRoutes } from "./routes/dashboard.js";
import { sitesRoutes } from "./routes/sites.js";

const PORT = parseInt(process.env.PORT ?? "3000", 10);

async function start() {
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === "production" ? "info" : "debug",
      transport:
        process.env.NODE_ENV !== "production"
          ? { target: "pino-pretty", options: { colorize: true } }
          : undefined,
    },
  });

  // Plugins
  await app.register(cookie, {
    secret: process.env.SESSION_SECRET ?? "dev-secret-change-me",
  });
  await app.register(formbody);

  // Drain endpoint needs raw body (NDJSON / JSON array from Vercel)
  // Forms are handled by formbody (application/x-www-form-urlencoded) registered above
  app.addContentTypeParser(
    ["application/x-ndjson", "application/json", "text/plain", "application/octet-stream"],
    { parseAs: "string" },
    (req, body, done) => done(null, body)
  );

  // Routes
  await app.register(authRoutes);
  await app.register(drainRoutes);
  await app.register(dashboardRoutes);
  await app.register(sitesRoutes);

  // Root redirect
  app.get("/", async (req, reply) => {
    return reply.redirect("/dashboard");
  });

  // Health check for Render
  app.get("/health", async () => ({ ok: true, ts: new Date().toISOString() }));

  // Run migrations on startup
  try {
    const { migrate } = await import("./db/runMigrations.js");
    await migrate();
  } catch (err) {
    app.log.warn({ err }, "Migrations failed to run (may already be applied)");
  }

  await app.listen({ port: PORT, host: "0.0.0.0" });
  app.log.info(`CrawlGuard running on port ${PORT}`);
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
