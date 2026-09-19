import type { FastifyInstance } from "fastify";
import { db } from "../db/client.js";
import { sites, botRequests } from "../db/schema.js";
import { detectBotFromArray, detectBot } from "../services/botDetector.js";
import { eq } from "drizzle-orm";

interface VercelProxyEvent {
  id?: string;
  source?: string;
  host?: string;
  timestamp?: number;
  projectId?: string;
  level?: string;
  environment?: string;
  proxy?: {
    method?: string;
    host?: string;
    path?: string;
    userAgent?: string[];
    clientIp?: string;
    statusCode?: number;
    responseByteSize?: number;
    region?: string;
    vercelCache?: string;
    pathType?: string;
  };
}

export async function drainRoutes(app: FastifyInstance) {
  /**
   * POST /api/drain/:siteId
   *
   * Vercel log drain receiver. Accepts NDJSON or JSON array.
   * Always returns 200 immediately (Vercel retries on non-2xx).
   * Site auth is via the siteId UUID being valid (no user token needed).
   */
  app.post<{ Params: { siteId: string } }>(
    "/api/drain/:siteId",
    async (req, reply) => {
      // Always ack immediately
      reply.code(200).send({ ok: true });

      const { siteId } = req.params;

      // Validate site exists
      const site = await db.query.sites.findFirst({
        where: eq(sites.id, siteId),
      });

      if (!site) {
        req.log.warn({ siteId }, "drain: unknown site");
        return;
      }

      // Parse NDJSON or JSON array body
      const rawBody = (req.body as string) ?? "";
      let events: VercelProxyEvent[] = [];

      try {
        const trimmed = rawBody.trim();
        if (trimmed.startsWith("[")) {
          // JSON array
          events = JSON.parse(trimmed);
        } else {
          // NDJSON
          events = trimmed
            .split("\n")
            .filter(Boolean)
            .map((line) => JSON.parse(line));
        }
      } catch (err) {
        req.log.error({ err }, "drain: failed to parse body");
        return;
      }

      let totalEvents = 0;
      let botHits = 0;
      const inserts: (typeof botRequests.$inferInsert)[] = [];

      for (const event of events) {
        totalEvents++;
        const proxy = event.proxy;
        if (!proxy) continue;

        const userAgents: string[] = Array.isArray(proxy.userAgent) ? proxy.userAgent : [];
        const uaString = typeof proxy.userAgent === "string" ? proxy.userAgent : "";

        const match = userAgents.length > 0
          ? detectBotFromArray(userAgents)
          : detectBot(uaString);

        if (!match.isBot) continue;

        botHits++;
        inserts.push({
          siteId: site.id,
          botName: match.botName!,
          company: match.company!,
          category: match.category!,
          method: proxy.method ?? "GET",
          path: proxy.path ?? "/",
          statusCode: proxy.statusCode ?? null,
          responseByteSize: proxy.responseByteSize ?? null,
          vercelCache: proxy.vercelCache ?? null,
          source: event.source ?? null,
          clientIp: proxy.clientIp ?? null,
          region: proxy.region ?? null,
          ts: event.timestamp ? new Date(event.timestamp) : new Date(),
        });
      }

      if (inserts.length > 0) {
        try {
          // Batch insert in chunks of 100
          for (let i = 0; i < inserts.length; i += 100) {
            await db.insert(botRequests).values(inserts.slice(i, i + 100));
          }
        } catch (err) {
          req.log.error({ err }, "drain: failed to insert bot requests");
        }
      }

      req.log.info(
        { siteId, totalEvents, botHits },
        "drain: processed"
      );
    }
  );
}
