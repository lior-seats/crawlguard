export function layout(title: string, body: string, flash?: string): string {
  const flashHtml = flash
    ? `<div class="flash">${escHtml(flash)}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escHtml(title)} — CrawlGuard</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #0d1117;
      --surface: #161b22;
      --border: #30363d;
      --text: #e6edf3;
      --muted: #8b949e;
      --accent: #58a6ff;
      --danger: #f85149;
      --success: #3fb950;
      --warn: #d29922;
    }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      min-height: 100vh;
    }
    a { color: var(--accent); text-decoration: none; }
    a:hover { text-decoration: underline; }

    header {
      border-bottom: 1px solid var(--border);
      padding: 12px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: var(--surface);
    }
    .logo { font-weight: 700; font-size: 16px; letter-spacing: -0.3px; }
    .logo span { color: var(--accent); }
    nav a { color: var(--muted); font-size: 13px; margin-left: 20px; }
    nav a:hover { color: var(--text); }

    main { max-width: 960px; margin: 0 auto; padding: 32px 24px; }
    h1 { font-size: 22px; font-weight: 600; margin-bottom: 20px; }
    h2 { font-size: 16px; font-weight: 600; margin-bottom: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; }

    .flash {
      background: #1a2a1a;
      border: 1px solid var(--success);
      color: var(--success);
      border-radius: 6px;
      padding: 10px 16px;
      margin-bottom: 20px;
      font-size: 13px;
    }
    .flash.error {
      background: #2a1a1a;
      border-color: var(--danger);
      color: var(--danger);
    }

    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
    }

    table { width: 100%; border-collapse: collapse; }
    th {
      text-align: left;
      padding: 10px 12px;
      border-bottom: 1px solid var(--border);
      color: var(--muted);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 500;
    }
    td {
      padding: 10px 12px;
      border-bottom: 1px solid #21262d;
      vertical-align: middle;
    }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: #1c2128; }

    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 500;
    }
    .badge-training { background: #1f3a2a; color: #3fb950; }
    .badge-search   { background: #1a2a3a; color: #58a6ff; }
    .badge-assistant { background: #2a2a1a; color: #d29922; }
    .badge-crawler  { background: #2a1f1f; color: #f85149; }

    .cost { font-family: ui-monospace, monospace; font-size: 13px; }
    .cost-nonzero { color: var(--warn); }
    .cost-zero { color: var(--muted); }

    input[type="email"], input[type="text"] {
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      color: var(--text);
      font-size: 14px;
      padding: 8px 12px;
      width: 100%;
      outline: none;
    }
    input:focus { border-color: var(--accent); }

    button, .btn {
      background: var(--accent);
      border: none;
      border-radius: 6px;
      color: #0d1117;
      cursor: pointer;
      display: inline-block;
      font-size: 14px;
      font-weight: 600;
      padding: 8px 20px;
      transition: opacity 0.15s;
    }
    button:hover, .btn:hover { opacity: 0.85; }

    .btn-sm { padding: 5px 12px; font-size: 12px; }
    .btn-outline {
      background: transparent;
      border: 1px solid var(--border);
      color: var(--text);
    }
    .btn-outline:hover { background: var(--surface); opacity: 1; }

    .form-group { margin-bottom: 16px; }
    label { display: block; margin-bottom: 6px; font-size: 13px; color: var(--muted); }

    .empty-state {
      text-align: center;
      padding: 48px 0;
      color: var(--muted);
    }
    .empty-state h3 { font-size: 16px; margin-bottom: 8px; color: var(--text); }
    .empty-state p { font-size: 13px; max-width: 400px; margin: 0 auto 20px; }

    .mono { font-family: ui-monospace, monospace; font-size: 12px; color: var(--muted); }
    .text-right { text-align: right; }
    .text-muted { color: var(--muted); }
    .mt-4 { margin-top: 16px; }
    .mt-8 { margin-top: 32px; }
    code {
      background: #21262d;
      border-radius: 4px;
      padding: 2px 6px;
      font-family: ui-monospace, monospace;
      font-size: 12px;
    }
    pre {
      background: #21262d;
      border-radius: 6px;
      padding: 14px 16px;
      overflow-x: auto;
      font-family: ui-monospace, monospace;
      font-size: 12px;
      line-height: 1.6;
      color: var(--text);
    }
  </style>
</head>
<body>
  <header>
    <div class="logo">Crawl<span>Guard</span></div>
    <nav>
      <a href="/dashboard">Dashboard</a>
      <a href="/sites/new">Add Site</a>
      <a href="/auth/logout">Logout</a>
    </nav>
  </header>
  <main>
    ${flashHtml}
    ${body}
  </main>
</body>
</html>`;
}

export function publicLayout(title: string, body: string, flash?: string): string {
  const flashHtml = flash
    ? `<div class="flash ${flash.startsWith("Error") ? "error" : ""}">${escHtml(flash)}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escHtml(title)} — CrawlGuard</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #0d1117; --surface: #161b22; --border: #30363d;
      --text: #e6edf3; --muted: #8b949e; --accent: #58a6ff;
    }
    body {
      background: var(--bg); color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      font-size: 14px; line-height: 1.5;
      display: flex; align-items: center; justify-content: center; min-height: 100vh;
    }
    a { color: var(--accent); text-decoration: none; }
    .logo { font-weight: 700; font-size: 22px; letter-spacing: -0.5px; margin-bottom: 8px; }
    .logo span { color: var(--accent); }
    .tagline { color: var(--muted); font-size: 14px; margin-bottom: 28px; }
    .card {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 12px; padding: 32px; width: 100%; max-width: 400px;
    }
    .flash {
      background: #1a2a1a; border: 1px solid #3fb950; color: #3fb950;
      border-radius: 6px; padding: 10px 16px; margin-bottom: 20px; font-size: 13px;
    }
    .flash.error { background: #2a1a1a; border-color: #f85149; color: #f85149; }
    input[type="email"] {
      background: var(--bg); border: 1px solid var(--border);
      border-radius: 6px; color: var(--text); font-size: 14px;
      padding: 10px 14px; width: 100%; outline: none; margin-bottom: 12px;
    }
    input:focus { border-color: var(--accent); }
    button {
      background: var(--accent); border: none; border-radius: 6px;
      color: #0d1117; cursor: pointer; font-size: 14px; font-weight: 600;
      padding: 10px; width: 100%; transition: opacity 0.15s;
    }
    button:hover { opacity: 0.85; }
    .hint { color: var(--muted); font-size: 12px; margin-top: 16px; text-align: center; }
  </style>
</head>
<body>
  <div>
    <div style="text-align:center; margin-bottom: 24px;">
      <div class="logo">Crawl<span>Guard</span></div>
      <div class="tagline">See which AI bots are crawling your site</div>
    </div>
    <div class="card">
      ${flashHtml}
      ${body}
    </div>
  </div>
</body>
</html>`;
}

export function escHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
