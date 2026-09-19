import type { FastifyInstance } from "fastify";
import { db } from "../db/client.js";
import { sites } from "../db/schema.js";
import { getSessionUserId } from "../services/session.js";
import { layout, escHtml } from "../templates/layout.js";
import { eq } from "drizzle-orm";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

export async function sitesRoutes(app: FastifyInstance) {
  // GET /sites/new — show form
  app.get("/sites/new", async (req, reply) => {
    const userId = getSessionUserId(req);
    if (!userId) return reply.redirect("/auth/login");

    const html = layout(
      "Add Site",
      `<h1>Add a New Site</h1>
      <div class="card">
        <form method="POST" action="/sites">
          <div class="form-group">
            <label for="domain">Your domain</label>
            <input type="text" id="domain" name="domain" placeholder="myapp.com" required />
          </div>
          <div class="form-group">
            <label for="vercel_project_id">Vercel Project ID <span class="text-muted">(optional — found in Project Settings)</span></label>
            <input type="text" id="vercel_project_id" name="vercel_project_id" placeholder="prj_xxxxxxxxxxxx" />
          </div>
          <button type="submit">Create Site &amp; Get Drain URL</button>
        </form>
      </div>`
    );

    return reply.type("text/html").send(html);
  });

  // POST /sites — create site
  app.post("/sites", async (req, reply) => {
    const userId = getSessionUserId(req);
    if (!userId) return reply.redirect("/auth/login");

    const { domain, vercel_project_id } = req.body as {
      domain?: string;
      vercel_project_id?: string;
    };

    if (!domain || domain.trim().length === 0) {
      return reply.redirect("/sites/new?flash=Please+enter+a+domain.");
    }

    const cleanDomain = domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");

    const [site] = await db
      .insert(sites)
      .values({
        userId,
        domain: cleanDomain,
        vercelProjectId: vercel_project_id?.trim() || null,
        drainSecret: null,
      })
      .returning();

    const drainUrl = `${BASE_URL}/api/drain/${site.id}`;

    const html = layout(
      "Site Created",
      `<h1>✅ Site added!</h1>
      <div class="card">
        <h2>Your Drain URL</h2>
        <p style="margin-bottom: 12px; color: var(--muted);">Copy this URL and paste it in Vercel's Log Drain settings.</p>
        <pre>${escHtml(drainUrl)}</pre>

        <div class="mt-8">
          <h2>Setup Instructions</h2>
          <ol style="color: var(--muted); padding-left: 20px; line-height: 2;">
            <li>Go to your Vercel team: <strong>Settings → Log Drains</strong></li>
            <li>Click <strong>Add Drain</strong></li>
            <li>Paste the drain URL above</li>
            <li>Format: <strong>NDJSON</strong></li>
            <li>Sources: check <strong>Lambda</strong>, <strong>Edge</strong>, <strong>Static</strong></li>
            <li>Environments: <strong>Production</strong></li>
            <li>Click <strong>Save</strong></li>
          </ol>
        </div>

        <div class="mt-8">
          <p>Once connected, bot traffic will appear on your <a href="/dashboard">dashboard</a> within a few minutes of the next request.</p>
        </div>
      </div>
      <a href="/dashboard" class="btn btn-outline">← Back to Dashboard</a>`
    );

    return reply.type("text/html").send(html);
  });

  // GET /sites/:siteId/drain-url — show drain URL for existing site
  app.get<{ Params: { siteId: string } }>("/sites/:siteId/drain-url", async (req, reply) => {
    const userId = getSessionUserId(req);
    if (!userId) return reply.redirect("/auth/login");

    const site = await db.query.sites.findFirst({
      where: eq(sites.id, req.params.siteId),
    });

    if (!site || site.userId !== userId) {
      return reply.code(404).type("text/html").send(layout("Not Found", "<p>Site not found.</p>"));
    }

    const drainUrl = `${BASE_URL}/api/drain/${site.id}`;
    return reply.type("text/html").send(
      layout(
        "Drain URL",
        `<h1>${escHtml(site.domain)}</h1>
        <div class="card">
          <h2>Drain URL</h2>
          <pre>${escHtml(drainUrl)}</pre>
        </div>
        <a href="/dashboard" class="btn btn-outline mt-4">← Dashboard</a>`
      )
    );
  });
}
