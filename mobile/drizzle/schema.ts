import {
  boolean,
  decimal,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Google OAuth `sub` claim, used as the stable per-user identifier. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const catalogueItems = mysqlTable("catalogue_items", {
  id: int("id").autoincrement().primaryKey(),
  // Null for legacy/admin-seeded listings created before ownership was tracked.
  userId: int("user_id"),
  itemType: varchar("item_type", { length: 32 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description").notNull(),
  price: varchar("price", { length: 64 }),
  imageUrl: varchar("image_url", { length: 512 }),
  status: mysqlEnum("status", ["draft", "pending_review", "approved"])
    .default("draft")
    .notNull(),
  listingMeta: json("listing_meta"),
  lat: decimal("lat", { precision: 10, scale: 7 }),
  lng: decimal("lng", { precision: 10, scale: 7 }),
  // Which tenant's storefront this listing belongs to (owner_config.id).
  // Column already exists physically (nullable, DEFAULT 1) — added directly
  // against prod, not via a Drizzle migration. See backend/app/models/
  // domain.py's CatalogueItem.tenant_id for the canonical column def.
  tenantId: int("tenant_id").default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type CatalogueItem = typeof catalogueItems.$inferSelect;
export type InsertCatalogueItem = typeof catalogueItems.$inferInsert;

// Owned/created by the web business site's Python/SQLAlchemy side
// (backend/app/models/domain.py OwnerConfig). This table already exists
// physically — this is a minimal, additive, read-mapping-only declaration
// of the subset of columns the mobile app needs for tenant resolution and
// branding display. Do NOT run drizzle-kit generate/migrate for this table.
export const ownerConfig = mysqlTable("owner_config", {
  id: int("id").autoincrement().primaryKey(),
  businessName: varchar("business_name", { length: 255 }),
  siteEmoji: varchar("site_emoji", { length: 16 }),
  slug: varchar("slug", { length: 64 }),
  tagline: varchar("tagline", { length: 512 }),
  chatGreeting: text("chat_greeting"),
  chatPlaceholder: varchar("chat_placeholder", { length: 255 }),
  chatDisclaimer: text("chat_disclaimer"),
  // Each entry: {key, active, emoji, label} — key is a web item_type
  // (pet/service/event/stall/lost_found/hike/petting_zoo_booking), not a
  // mobile AppMode. See lib/tenant-modes.ts for the mapping between them.
  modeConfig: json("mode_config"),
  heroPhotos: json("hero_photos"),
  brandColor: varchar("brand_color", { length: 16 }),
  bannerColor: varchar("banner_color", { length: 16 }),
  backgroundColor: varchar("background_color", { length: 16 }),
  // Gates the create-listing screen — off means only the web admin dashboard
  // can add listings, i.e. this tenant is a single-owner brand, not a
  // community marketplace. See backend/app/models/domain.py for the source.
  allowPublicListings: boolean("allow_public_listings"),
  // Waives the paid listing fee for public adopt/foster submissions on this
  // tenant only — see mobile/server/items.ts's submit mutation.
  freeListings: boolean("free_listings"),
  // Not a real FK (see subscriptions.adminToken's own comment) — joined
  // against subscriptions.adminToken to resolve "which tenant does this
  // signed-in user own" (see getOwnedTenantSlugForUser in server/db.ts).
  adminToken: varchar("admin_token", { length: 64 }),
});

export type OwnerConfig = typeof ownerConfig.$inferSelect;

export const profiles = mysqlTable("profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().unique(),
  displayName: varchar("display_name", { length: 255 }),
  profileType: varchar("profile_type", { length: 64 })
    .notNull()
    .default("individual"),
  location: varchar("location", { length: 255 }),
  contactEmail: varchar("contact_email", { length: 320 }),
  contactPhone: varchar("contact_phone", { length: 64 }),
  bio: text("bio"),
  preferredModesJson: json("preferred_modes_json"),
  profileMetaJson: json("profile_meta_json"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Profile = typeof profiles.$inferSelect;
export type InsertProfile = typeof profiles.$inferInsert;

export const subscriptions = mysqlTable("subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  // Row is only inserted after the PayPal Orders API capture is verified
  // server-side (see server/_core/paypal.ts + server/subscriptions.ts).
  // "refunded" is set manually (e.g. in the DB) if you process a refund in
  // the PayPal dashboard.
  status: mysqlEnum("status", ["active", "refunded"])
    .default("active")
    .notNull(),
  amountCents: int("amount_cents").notNull().default(100),
  currency: varchar("currency", { length: 8 }).notNull().default("USD"),
  // PayPal capture ID returned by the Orders API capture call. Unique per
  // payment — used to guard against double-recording the same capture.
  transactionId: varchar("transaction_id", { length: 64 }).unique(),
  tier: mysqlEnum("tier", ["listing", "admin"]).default("listing").notNull(),
  adminToken: varchar("admin_token", { length: 64 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

export const swipes = mysqlTable("swipes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  catalogueItemId: int("catalogue_item_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  // Required for persistSwipe's onDuplicateKeyUpdate to actually dedupe
  // instead of inserting a fresh row on every re-swipe of the same item.
  userItemUnique: uniqueIndex("swipes_user_id_catalogue_item_id_unique").on(table.userId, table.catalogueItemId),
}));

export type Swipe = typeof swipes.$inferSelect;
export type InsertSwipe = typeof swipes.$inferInsert;

export const conversations = mysqlTable("conversations", {
  id: int("id").autoincrement().primaryKey(),
  itemId: int("item_id").notNull(),
  buyerUserId: int("buyer_user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  // Required for getOrCreateConversation's onDuplicateKeyUpdate to reuse an
  // existing thread instead of creating a duplicate one per "Message" tap.
  itemBuyerUnique: uniqueIndex("conversations_item_id_buyer_user_id_unique").on(table.itemId, table.buyerUserId),
}));

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;

export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversation_id").notNull(),
  senderId: int("sender_id").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

// Daily write-action counter, shared by every capped tier (guests and
// base-paid users — admin subscribers are uncapped and never get a row here).
export const writeUsage = mysqlTable("write_usage", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().unique(),
  // "YYYY-MM-DD" (UTC) — the day this counter applies to.
  usageDate: varchar("usage_date", { length: 10 }).notNull(),
  count: int("count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type WriteUsage = typeof writeUsage.$inferSelect;
export type InsertWriteUsage = typeof writeUsage.$inferInsert;
