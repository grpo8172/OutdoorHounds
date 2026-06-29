import { eq } from "drizzle-orm";
import { z } from "zod";
import { catalogueItems } from "../drizzle/schema";
import { getDb } from "./db";
import { adminProcedure, publicProcedure, router } from "./_core/trpc";

export const itemsRouter = router({
  list: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(catalogueItems).where(eq(catalogueItems.status, "approved"));
  }),

  listPending: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(catalogueItems).where(eq(catalogueItems.status, "pending_review"));
  }),

  create: adminProcedure
    .input(
      z.object({
        itemType: z.enum(["pet", "hike", "service"]),
        name: z.string().min(1),
        description: z.string().min(1),
        price: z.string().optional(),
        imageUrl: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.insert(catalogueItems).values({ ...input, status: "pending_review" });
      return { success: true };
    }),

  approve: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db
        .update(catalogueItems)
        .set({ status: "approved" })
        .where(eq(catalogueItems.id, input.id));
      return { success: true };
    }),
});
