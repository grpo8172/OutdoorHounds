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
        itemType: z.enum(["pet", "hike", "service", "petting_zoo_booking"]),
        name: z.string().min(1),
        description: z.string().min(1),
        price: z.string().optional(),
        imageUrl: z.string().optional(),
        listingMeta: z
          .object({
            animals_included:  z.string().optional(),
            booking_duration:  z.string().optional(),
            available_dates:   z.string().optional(),
            service_area:      z.string().optional(),
            max_guests:        z.number().int().positive().optional(),
            suitable_ages:     z.string().optional(),
            indoor_outdoor:    z.string().optional(),
            safety_notes:      z.string().optional(),
            insurance_notes:   z.string().optional(),
            contact:           z.string().optional(),
            photos:            z.array(z.string()).optional(),
          })
          .optional(),
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
