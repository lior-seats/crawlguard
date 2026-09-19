# CrawlGuard

> See which AI bots are crawling your site and what it's costing you.

CrawlGuard receives Vercel log drain events and shows you a real-time breakdown of AI crawler traffic — GPTBot, ClaudeBot, PerplexityBot, and 15+ others — with estimated bandwidth and compute costs.

## MVP (Phase 1)

- ✅ Magic-link email auth (no passwords)
- ✅ Add a site → get a Vercel log drain URL
- ✅ Receives Vercel log drain NDJSON events
- ✅ Detects 18+ AI bots by User-Agent
- ✅ Dashboard: per-bot breakdown, request count, estimated cost
- ✅ Deployed on Render (free tier)

## Quickstart (local dev)

```bash
cp .env.example .env
# Edit .env with real values

npm install
npm run migrate    # create tables
npm run dev        # tsx watch
```

## Connecting a Vercel Log Drain

1. Go to your Vercel team → **Settings → Log Drains**
2. Click **Add Drain**
3. URL: `https://<your-render-url>/api/drain/<siteId>`  
   (get this from the CrawlGuard dashboard after adding your site)
4. Format: **NDJSON**
5. Sources: **Lambda**, **Edge**, **Static**
6. Environments: **Production**
7. Click **Save**

Within a few minutes of the next production request, bot traffic will appear on your dashboard.

## Cost Calculation

Only `vercelCache: MISS` requests are counted (cached requests are free).

```
bandwidth_cost = total_response_bytes / 1_073_741_824 * $0.40
compute_cost   = miss_request_count * $0.0000027
total_cost     = bandwidth_cost + compute_cost
```

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `SESSION_SECRET` | Random 32+ char string for cookie signing |
| `RESEND_API_KEY` | From [resend.com](https://resend.com) |
| `BASE_URL` | Your deployed URL, e.g. `https://crawlguard.onrender.com` |
| `PORT` | Server port (set automatically by Render) |

## Phase 2 Ideas

- Email alerts when cost exceeds threshold
- `robots.txt` recommendations
- Block-list generation (Vercel Firewall rules)
- Stripe billing ($29/mo)
- Historical trend charts
- Webhook notifications
