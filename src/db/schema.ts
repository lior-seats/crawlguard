import { pgTable, uuid, text, timestamp, integer, index } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const magicLinkTokens = pgTable("magic_link_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  token: text("token").notNull().unique(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sites = pgTable("sites", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  vercelProjectId: text("vercel_project_id"),
  domain: text("domain").notNull(),
  drainSecret: text("drain_secret"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const botRequests = pgTable(
  "bot_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    siteId: uuid("site_id").notNull().references(() => sites.id),
    botName: text("bot_name").notNull(),
    company: text("company").notNull(),
    category: text("category").notNull(),
    method: text("method").notNull().default("GET"),
    path: text("path").notNull(),
    statusCode: integer("status_code"),
    responseByteSize: integer("response_byte_size"),
    vercelCache: text("vercel_cache"),
    source: text("source"),
    clientIp: text("client_ip"),
    region: text("region"),
    ts: timestamp("ts", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("bot_requests_site_ts").on(table.siteId, table.ts),
  ]
);

export type User = typeof users.$inferSelect;
export type Site = typeof sites.$inferSelect;
export type BotRequest = typeof botRequests.$inferSelect;
