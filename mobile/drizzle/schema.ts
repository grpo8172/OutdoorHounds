import {
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type CatalogueItem = typeof catalogueItems.$inferSelect;
export type InsertCatalogueItem = typeof catalogueItems.$inferInsert;

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
  amountCents: int("amount_cents").notNull().default(1000),
  currency: varchar("currency", { length: 8 }).notNull().default("USD"),
  // PayPal capture ID returned by the Orders API capture call. Unique per
  // payment — used to guard against double-recording the same capture.
  transactionId: varchar("transaction_id", { length: 64 }),
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
});

export type Swipe = typeof swipes.$inferSelect;
export type InsertSwipe = typeof swipes.$inferInsert;

export const conversations = mysqlTable("conversations", {
  id: int("id").autoincrement().primaryKey(),
  itemId: int("item_id").notNull(),
  buyerUserId: int("buyer_user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

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
