# CrawlGuard — Deploy Guide

Everything you need to get from GitHub → live Render URL.

---

## Prerequisites

- Render account at [render.com](https://render.com)
- Resend account at [resend.com](https://resend.com) (free — 3,000 emails/month)

---

## Option A: One-Click Deploy (recommended)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/lior-seats/crawlguard)

Or open this URL directly:

```
https://render.com/deploy?repo=https://github.com/lior-seats/crawlguard
```

This reads `render.yaml` and creates:
- **Web service** (`crawlguard`) — free tier
- **Postgres database** (`crawlguard-db`) — free tier, 30-day trial

### Environment variables to fill in during deploy

| Variable | What to put |
|---|---|
| `RESEND_API_KEY` | From Resend dashboard → API Keys |
| `BASE_URL` | Leave **blank** — auto-detected from request host |
| `FROM_EMAIL` | Leave **blank** — uses `onboarding@resend.dev` by default |

After deploy, note your URL (e.g. `https://crawlguard-xxxx.onrender.com`).

**Optional but recommended:** Once you know the URL, set `BASE_URL` in Render → your service → Environment → edit → save → Manual Deploy. This makes magic links cleaner.

---

## Option B: Manual Render Deploy

### Step 1 — Create Postgres database

1. Render dashboard → **New → PostgreSQL**
2. Name: `crawlguard-db`
3. Database name: `crawlguard`
4. User: `crawlguard`
5. Region: Oregon (or closest to your users)
6. Plan: **Free** (30-day trial)
7. Click **Create Database**
8. Copy the **Internal Connection String** — you'll need it in Step 2

### Step 2 — Create Web Service

1. Render dashboard → **New → Web Service**
2. Connect your GitHub account if not already done
3. Select repo: `lior-seats/crawlguard`
4. Settings:
   - **Name:** crawlguard
   - **Runtime:** Node
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Plan:** Free
5. Environment Variables (add all of these):

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Paste the Internal Connection String from Step 1 |
| `SESSION_SECRET` | Generate: `openssl rand -hex 32` |
| `RESEND_API_KEY` | From Resend dashboard → API Keys |
| `BASE_URL` | Leave blank (or fill in after first deploy) |

6. Click **Create Web Service**
7. Wait for build to complete (~2-3 minutes)

---

## Option C: Railway (alternative if Render has issues)

1. Go to [railway.app](https://railway.app)
2. **New Project → Deploy from GitHub repo** → select `lior-seats/crawlguard`
3. Add a **PostgreSQL** plugin
4. Set environment variables (same as Option B above)
5. Railway auto-detects `npm start` from package.json

---

## Verifying the Deploy

Once live, test these:

```bash
# 1. Health check
curl https://your-url.onrender.com/health
# Should return: {"ok":true,"ts":"..."}

# 2. Login page loads
curl -I https://your-url.onrender.com/auth/login
# Should return: HTTP/2 200

# 3. Test drain endpoint with a fake bot event
curl -X POST https://your-url.onrender.com/api/drain/YOUR_SITE_ID \
  -H "Content-Type: application/x-ndjson" \
  -d '{"id":"test1","source":"lambda","timestamp":1700000000000,"proxy":{"method":"GET","path":"/","userAgent":["Mozilla/5.0 (compatible; GPTBot/1.0; +https://openai.com/gptbot)"],"statusCode":200,"responseByteSize":4096,"vercelCache":"MISS","region":"sfo1"}}'
# Should return: {"ok":true}
```

---

## Connecting a Vercel Log Drain

After deploy + first login + add your site:

1. **Vercel Team Settings → Log Drains → Add Drain**
2. URL: `https://your-url.onrender.com/api/drain/<siteId>`  
   *(shown in CrawlGuard after you add a site)*
3. Format: **NDJSON**
4. Sources: ✅ Lambda, ✅ Edge, ✅ Static
5. Environments: ✅ Production
6. Save

Bot traffic appears on your dashboard within minutes of the next production request.

---

## Resend Setup (5 min)

1. Sign up at [resend.com](https://resend.com)
2. Dashboard → **API Keys → Create API Key**
3. Name: `crawlguard-production`
4. Paste the key as `RESEND_API_KEY` in Render env vars

**Default sender:** `onboarding@resend.dev` — works immediately, no domain verification needed.

**Custom sender (optional):** Add your domain in Resend → Domains, verify DNS, then set:
```
FROM_EMAIL=CrawlGuard <noreply@yourdomain.com>
```

---

## Free Tier Limits (FYI)

| Service | Limit | When to upgrade |
|---|---|---|
| Render web service | Sleeps after 15 min idle | Upgrade to Starter ($7/mo) for Show HN |
| Render Postgres | 30-day free trial | Upgrade to Basic-256mb ($6/mo) before trial ends |
| Resend | 3,000 emails/month | Plenty for MVP; upgrade if needed |

**For Show HN (Monday 9am ET):** Upgrade the web service to Starter so it doesn't cold-start on first visitor.
