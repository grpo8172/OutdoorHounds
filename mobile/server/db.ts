import { and, eq, desc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  InsertProfile,
  Profile,
  users,
  profiles,
  subscriptions,
  swipes,
  conversations,
  messages,
  Conversation,
  Message,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getOrCreateProfile(
  userId: number,
  defaults: { displayName?: string | null; contactEmail?: string | null },
): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create profile: database not available");
    return;
  }

  try {
    await db
      .insert(profiles)
      .values({
        userId,
        displayName: defaults.displayName ?? null,
        contactEmail: defaults.contactEmail ?? null,
        profileType: "individual",
        preferredModesJson: [],
        profileMetaJson: {},
      })
      .onDuplicateKeyUpdate({ set: { userId } });
  } catch (error) {
    console.error("[Database] Failed to create profile:", error);
    throw error;
  }
}

export async function getProfileByUserId(
  userId: number,
): Promise<Profile | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateProfile(
  userId: number,
  data: Partial<InsertProfile>,
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(profiles).set(data).where(eq(profiles.userId, userId));
}

// Called only after the PayPal Orders API capture has been verified
// server-side (status === "COMPLETED") — see server/_core/paypal.ts.
export async function recordVerifiedPayment(
  userId: number,
  amountCents: number,
  currency: string,
  transactionId: string,
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(subscriptions).values({
    userId,
    amountCents,
    currency,
    transactionId,
    status: "active",
  });
}

// Guards against double-recording if a client retries captureOrder for the
// same PayPal capture (e.g. after a dropped response).
export async function hasSubscriptionForTransaction(
  transactionId: string,
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(eq(subscriptions.transactionId, transactionId))
    .limit(1);
  return result.length > 0;
}

export async function hasActiveSubscription(userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(
      and(eq(subscriptions.userId, userId), eq(subscriptions.status, "active")),
    )
    .limit(1);
  return result.length > 0;
}

// ── Swipes (saved listings) ──────────────────────────────────────────────────

export async function persistSwipe(userId: number, itemId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(swipes).values({ userId, catalogueItemId: itemId }).onDuplicateKeyUpdate({ set: { userId } });
}

export async function getSavedItemIds(userId: number): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({ id: swipes.catalogueItemId }).from(swipes).where(eq(swipes.userId, userId));
  return rows.map(r => r.id);
}

export async function getSavedItems(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.execute(sql`
    SELECT ci.id, ci.item_type, ci.name, ci.description, ci.price, ci.image_url, ci.listing_meta
    FROM swipes s
    JOIN catalogue_items ci ON ci.id = s.catalogue_item_id
    WHERE s.user_id = ${userId}
    ORDER BY s.created_at DESC
  `) as any;
  const data: any[] = Array.isArray(rows[0]) ? rows[0] : rows;
  return data.map((r: any) => ({
    id: r.id as number,
    itemType: r.item_type as string,
    name: r.name as string,
    description: r.description as string,
    price: (r.price ?? null) as string | null,
    imageUrl: (r.image_url ?? null) as string | null,
    listingMeta: r.listing_meta ? (typeof r.listing_meta === 'string' ? JSON.parse(r.listing_meta) : r.listing_meta) : null,
  }));
}

// ── Conversations & messages ─────────────────────────────────────────────────

export async function getOrCreateConversation(buyerUserId: number, itemId: number): Promise<Conversation> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(conversations).values({ itemId, buyerUserId }).onDuplicateKeyUpdate({ set: { itemId } });
  const rows = await db.select().from(conversations)
    .where(and(eq(conversations.itemId, itemId), eq(conversations.buyerUserId, buyerUserId)))
    .limit(1);
  return rows[0];
}

export async function getMessages(conversationId: number): Promise<Message[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(messages).where(eq(messages.conversationId, conversationId)).orderBy(messages.createdAt);
}

export async function createMessage(conversationId: number, senderId: number, body: string): Promise<Message> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(messages).values({ conversationId, senderId, body });
  const rows = await db.select().from(messages)
    .where(and(eq(messages.conversationId, conversationId), eq(messages.senderId, senderId)))
    .orderBy(desc(messages.createdAt)).limit(1);
  return rows[0];
}

export async function getMyConversations(userId: number): Promise<Array<Conversation & { lastMessage: string | null; itemName: string | null; buyerProfile: Profile | null }>> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(conversations).where(eq(conversations.buyerUserId, userId)).orderBy(desc(conversations.createdAt));
  if (rows.length === 0) return [];

  const enriched = await Promise.all(rows.map(async (conv) => {
    const lastMsgs = await db!.select({ body: messages.body }).from(messages)
      .where(eq(messages.conversationId, conv.id)).orderBy(desc(messages.createdAt)).limit(1);
    const itemRows = await db!.execute(sql`SELECT name FROM catalogue_items WHERE id = ${conv.itemId} LIMIT 1`) as any;
    const itemName = itemRows?.[0]?.[0]?.name ?? null;
    const buyerProfiles = await db!.select().from(profiles).where(eq(profiles.userId, conv.buyerUserId)).limit(1);
    const buyerProfile = buyerProfiles[0] ?? null;
    return { ...conv, lastMessage: lastMsgs[0]?.body ?? null, itemName, buyerProfile };
  }));
  return enriched;
}
