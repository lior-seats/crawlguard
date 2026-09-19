import type { FastifyInstance } from "fastify";
import { db } from "../db/client.js";
import { sites, botRequests } from "../db/schema.js";
import { getSessionUserId } from "../services/session.js";
import { layout, escHtml } from "../templates/layout.js";
import { eq, and, gte, sql, desc } from "drizzle-orm";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

function categoryBadge(category: string): string {
  const map: Record<string, string> = {
    "ai-training": "badge-training",
    "ai-search": "badge-search",
    "ai-assistant": "badge-assistant",
    "general-crawler": "badge-crawler",
  };
  const cls = map[category] ?? "badge-crawler";
  return `<span class="badge ${cls}">${escHtml(category)}</span>`;
}

function formatCost(dollars: number): string {
  if (dollars === 0) return `<span class="cost cost-zero">$0.00</span>`;
  if (dollars < 0.001) return `<span class="cost cost-nonzero">&lt;$0.001</span>`;
  return `<span class="cost cost-nonzero">$${dollars.toFixed(4)}</span>`;
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export async function dashboardRoutes(app: FastifyInstance) {
  app.get("/dashboard", async (req, reply) => {
    const userId = getSessionUserId(req);
    if (!userId) return reply.redirect("/auth/login");

    const userSites = await db.query.sites.findMany({
      where: eq(sites.userId, userId),
    });

    if (userSites.length === 0) {
      const html = layout(
        "Dashboard",
        `<h1>Dashboard</h1>
        <div class="empty-state">
          <h3>No sites yet</h3>
          <p>Add your first site to start tracking AI bot traffic from your Vercel log drain.</p>
          <a href="/sites/new" class="btn">Add Your First Site</a>
        </div>`
      );
      return reply.type("text/html").send(html);
    }

    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // For each site, aggregate bot stats for 24h (only MISS = billed traffic)
    let siteSections = "";

    for (const site of userSites) {
      const drainUrl = `${BASE_URL}/api/drain/${site.id}`;

      // Aggregate: bot_name, company, category, request_count, total_bytes, last_seen
      const rows = await db
        .select({
          botName: botRequests.botName,
          company: botRequests.company,
          category: botRequests.category,
          requestCount: sql<number>`count(*)::int`,
          totalBytes: sql<number>`coalesce(sum(case when ${botRequests.vercelCache} = 'MISS' then ${botRequests.responseByteSize} else 0 end), 0)::bigint`,
          missCount: sql<number>`count(case when ${botRequests.vercelCache} = 'MISS' then 1 end)::int`,
          lastSeen: sql<Date>`max(${botRequests.ts})`,
        })
        .from(botRequests)
        .where(
          and(
            eq(botRequests.siteId, site.id),
            gte(botRequests.ts, since24h)
          )
        )
        .groupBy(botRequests.botName, botRequests.company, botRequests.category)
        .orderBy(desc(sql`count(*)`));

      const totalRequests = rows.reduce((s, r) => s + Number(r.requestCount), 0);
      const totalCostDollars = rows.reduce((s, r) => {
        const bwCost = (Number(r.totalBytes) / 1_073_741_824) * 0.40;
        const computeCost = Number(r.missCount) * 0.0000027;
        return s + bwCost + computeCost;
      }, 0);

      let tableContent: string;
      if (rows.length === 0) {
        tableContent = `<tr><td colspan="5" style="text-align:center; padding: 32px; color: var(--muted);">
          No bot traffic in the last 24h. Make sure your log drain is connected.
        </td></tr>`;
      } else {
        tableContent = rows.map((row) => {
          const bwCost = (Number(row.totalBytes) / 1_073_741_824) * 0.40;
          const computeCost = Number(row.missCount) * 0.0000027;
          const rowCost = bwCost + computeCost;
          return `<tr>
            <td><strong>${escHtml(row.botName)}</strong></td>
            <td>${escHtml(row.company)}</td>
            <td>${categoryBadge(row.category)}</td>
            <td>${Number(row.requestCount).toLocaleString()}</td>
            <td>${formatCost(rowCost)}</td>
            <td class="text-muted">${timeAgo(new Date(row.lastSeen))}</td>
          </tr>`;
        }).join("\n");
      }

      siteSections += `
      <div class="card" style="margin-bottom: 28px;">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: 16px;">
          <div>
            <strong style="font-size:16px;">${escHtml(site.domain)}</strong>
            <span class="text-muted" style="margin-left: 12px; font-size:12px;">Last 24h: ${totalRequests.toLocaleString()} bot requests · Est. cost: ${totalCostDollars < 0.001 && totalCostDollars > 0 ? "<$0.001" : `$${totalCostDollars.toFixed(4)}`}</span>
          </div>
          <a href="/sites/${site.id}/drain-url" class="btn btn-outline btn-sm">Drain URL</a>
        </div>
        <table>
          <thead>
            <tr>
              <th>Bot</th>
              <th>Company</th>
              <th>Category</th>
              <th>Requests (24h)</th>
              <th>Est. Cost</th>
              <th>Last Seen</th>
            </tr>
          </thead>
          <tbody>
            ${tableContent}
          </tbody>
        </table>
        <p class="text-muted mt-4" style="font-size:11px;">
          💡 Cost estimate uses only cache-MISS requests (billed traffic). Bandwidth at $0.40/GB + compute at $0.0000027/req.
        </p>
      </div>`;
    }

    const html = layout(
      "Dashboard",
      `<div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: 24px;">
        <h1 style="margin:0;">Dashboard</h1>
        <a href="/sites/new" class="btn btn-sm">+ Add Site</a>
      </div>
      ${siteSections}`
    );

    return reply.type("text/html").send(html);
  });
}
