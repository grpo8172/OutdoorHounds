import { int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

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
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
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
  itemType: varchar("item_type", { length: 32 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description").notNull(),
  price: varchar("price", { length: 64 }),
  imageUrl: varchar("image_url", { length: 512 }),
  status: mysqlEnum("status", ["draft", "pending_review", "approved"]).default("draft").notNull(),
  listingMeta: json("listing_meta"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type CatalogueItem = typeof catalogueItems.$inferSelect;
export type InsertCatalogueItem = typeof catalogueItems.$inferInsert;
