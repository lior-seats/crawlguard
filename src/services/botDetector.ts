/**
 * CrawlGuard bot detection service.
 * Identifies AI/ML crawlers from a User-Agent string.
 * Ported from crawlguard-spike branch.
 */

export interface BotMatch {
  isBot: boolean;
  botName: string | null;
  company: string | null;
  category: "ai-training" | "ai-assistant" | "ai-search" | "general-crawler" | null;
}

interface BotDefinition {
  name: string;
  company: string;
  category: BotMatch["category"];
  signatures: string[];
}

const BOT_DEFINITIONS: BotDefinition[] = [
  // OpenAI
  { name: "GPTBot",             company: "OpenAI",        category: "ai-training",      signatures: ["gptbot"] },
  { name: "ChatGPT-User",       company: "OpenAI",        category: "ai-assistant",     signatures: ["chatgpt-user"] },
  { name: "OAI-SearchBot",      company: "OpenAI",        category: "ai-search",        signatures: ["oai-searchbot"] },
  // Anthropic
  { name: "ClaudeBot",          company: "Anthropic",     category: "ai-training",      signatures: ["claudebot", "claude-web", "anthropic-ai"] },
  // Meta
  { name: "Meta-ExternalAgent", company: "Meta",          category: "ai-training",      signatures: ["meta-externalagent"] },
  { name: "FacebookBot",        company: "Meta",          category: "ai-training",      signatures: ["facebookexternalhit"] },
  // Google
  { name: "Google-Extended",    company: "Google",        category: "ai-training",      signatures: ["google-extended"] },
  { name: "GoogleBot",          company: "Google",        category: "general-crawler",  signatures: ["googlebot"] },
  // Perplexity
  { name: "PerplexityBot",      company: "Perplexity",    category: "ai-search",        signatures: ["perplexitybot"] },
  // ByteDance
  { name: "Bytespider",         company: "ByteDance",     category: "ai-training",      signatures: ["bytespider"] },
  // Common Crawl
  { name: "CCBot",              company: "Common Crawl",  category: "general-crawler",  signatures: ["ccbot"] },
  // Amazon
  { name: "Amazonbot",          company: "Amazon",        category: "ai-training",      signatures: ["amazonbot"] },
  // DuckDuckGo
  { name: "DuckAssistBot",      company: "DuckDuckGo",    category: "ai-assistant",     signatures: ["duckassistbot"] },
  // Apple
  { name: "Applebot-Extended",  company: "Apple",         category: "ai-training",      signatures: ["applebot-extended"] },
  // Cohere
  { name: "cohere-ai",          company: "Cohere",        category: "ai-training",      signatures: ["cohere-ai"] },
  // Diffbot
  { name: "DiffBot",            company: "Diffbot",       category: "ai-training",      signatures: ["diffbot"] },
  // Semrush
  { name: "SemrushBot",         company: "Semrush",       category: "general-crawler",  signatures: ["semrushbot"] },
  // Ahrefs
  { name: "AhrefsBot",          company: "Ahrefs",        category: "general-crawler",  signatures: ["ahrefsbot"] },
];

export function detectBot(userAgent: string): BotMatch {
  if (!userAgent) return { isBot: false, botName: null, company: null, category: null };
  const ua = userAgent.toLowerCase();
  for (const bot of BOT_DEFINITIONS) {
    if (bot.signatures.some((sig) => ua.includes(sig))) {
      return { isBot: true, botName: bot.name, company: bot.company, category: bot.category };
    }
  }
  return { isBot: false, botName: null, company: null, category: null };
}

export function detectBotFromArray(userAgents: string[]): BotMatch {
  for (const ua of userAgents) {
    const result = detectBot(ua);
    if (result.isBot) return result;
  }
  return { isBot: false, botName: null, company: null, category: null };
}
