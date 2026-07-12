import { and, eq, inArray, sql, isNotNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { catalogueItems } from "../drizzle/schema";
import { getDb, getProfileByUserId } from "./db";
import { adminProcedure, protectedProcedure, publicProcedure, writeProcedure, router } from "./_core/trpc";

const ITEM_TYPES = [
  "pet",
  "hike",
  "service",
  "petting_zoo_booking",
  "event",
  "stall",
  "lost_found",
] as const;

// Each app mode maps to a unique itemType stored in catalogue_items.item_type.
// Legacy types (hike, petting_zoo_booking) roll up to pet_events for backwards compat.
const MODE_TO_ITEM_TYPE: Record<string, string> = {
  adopt_or_foster: "pet",
  pet_services:    "service",
  pet_events:      "event",
  stalls_and_shops: "stall",
  lost_and_found:  "lost_found",
};

const LEGACY_ITEM_TYPES: Record<string, string[]> = {
  pet_events: ["event", "hike", "petting_zoo_booking"],
};

const listingMetaSchema = z
  .object({
    // location / identity
    location:          z.string().optional(),
    breed:             z.string().optional(),
    age:               z.number().optional(),
    contact:           z.string().optional(),
    rating:            z.number().optional(),
    // media
    photos:            z.array(z.string()).optional(),
    videoUrl:          z.string().optional(),
    // legacy event / service fields
    animals_included:  z.string().optional(),
    booking_duration:  z.string().optional(),
    available_dates:   z.string().optional(),
    service_area:      z.string().optional(),
    max_guests:        z.number().int().positive().optional(),
    suitable_ages:     z.string().optional(),
    indoor_outdoor:    z.string().optional(),
    safety_notes:      z.string().optional(),
    insurance_notes:   z.string().optional(),
    cardColor:         z.string().optional(),
    tileDescription:   z.string().optional(),
  })
  .optional();

async function geocode(location: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`;
    const res = await fetch(url, { headers: { "User-Agent": "OutdoorHoundsApp/1.0 (contact@outdoorhounds.app)" } });
    const data = await res.json() as Array<{ lat: string; lon: string }>;
    if (data[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {}
  return null;
}

export const itemsRouter = router({
  /** All approved listings (used for admin views). */
  list: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(catalogueItems).where(eq(catalogueItems.status, "approved"));
  }),

  /** Approved listings filtered to a specific app mode via the itemType mapping. */
  listByMode: publicProcedure
    .input(
      z.object({
        mode: z.enum([
          "adopt_or_foster",
          "pet_services",
          "pet_events",
          "stalls_and_shops",
          "lost_and_found",
        ]),
        lat: z.number().optional(),
        lng: z.number().optional(),
        radiusKm: z.number().optional(),
      }),
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const types = LEGACY_ITEM_TYPES[input.mode] ?? [MODE_TO_ITEM_TYPE[input.mode]];

      const conditions = [
        eq(catalogueItems.status, "approved"),
        inArray(catalogueItems.itemType, types),
      ];

      if (input.lat != null && input.lng != null && input.radiusKm != null) {
        // Haversine formula — only filters listings that have coordinates; ones without lat/lng are always included
        conditions.push(
          sql`(${catalogueItems.lat} IS NULL OR ${catalogueItems.lng} IS NULL OR
            (6371 * acos(LEAST(1.0,
              cos(radians(${input.lat})) * cos(radians(${catalogueItems.lat})) *
              cos(radians(${catalogueItems.lng}) - radians(${input.lng})) +
              sin(radians(${input.lat})) * sin(radians(${catalogueItems.lat}))
            ))) <= ${input.radiusKm})`
        );
      }

      return db.select().from(catalogueItems).where(and(...conditions));
    }),

  listPending: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(catalogueItems).where(eq(catalogueItems.status, "pending_review"));
  }),

  create: adminProcedure
    .input(
      z.object({
        itemType: z.enum(ITEM_TYPES),
        name: z.string().min(1),
        description: z.string().min(1),
        price: z.string().optional(),
        imageUrl: z.string().optional(),
        listingMeta: listingMetaSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db
        .insert(catalogueItems)
        .values({ ...input, userId: ctx.user.id, status: "pending_review" });
      return { success: true };
    }),

  /**
   * Submission by an onboarded user — appears immediately in the swipe feed
   * (status: approved). Stores mode-specific detail fields inside
   * listingMeta JSON. writeProcedure gates payment/guest-quota; a completed
   * profile is re-checked here since the client-side gate on /create-listing
   * can't be trusted on its own.
   */
  submit: writeProcedure
    .input(
      z.object({
        mode: z.enum([
          "adopt_or_foster",
          "pet_services",
          "pet_events",
          "stalls_and_shops",
          "lost_and_found",
        ]),
        name: z.string().min(1),
        description: z.string().min(1),
        price: z.string().optional(),
        imageUrls: z.array(z.string()).optional(),
        videoUrl: z.string().optional(),
        location: z.string().optional(),
        breed: z.string().optional(),
        age: z.number().int().positive().optional(),
        contact: z.string().optional(),
        cardColor: z.string().optional(),
        tileDescription: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const profile = await getProfileByUserId(ctx.user.id);
      if (!profile?.displayName) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Complete your profile before creating a listing.",
        });
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { mode, imageUrls, videoUrl, location, breed, age, contact, cardColor, tileDescription, ...rest } = input;
      const photos = imageUrls?.filter(Boolean) ?? [];

      const coords = location ? await geocode(location) : null;

      await db.insert(catalogueItems).values({
        ...rest,
        userId: ctx.user.id,
        itemType: MODE_TO_ITEM_TYPE[mode],
        imageUrl: photos[0] || undefined,
        lat: coords?.lat?.toString() ?? null,
        lng: coords?.lng?.toString() ?? null,
        listingMeta: {
          photos,
          videoUrl: videoUrl || undefined,
          location: location || undefined,
          breed:            breed            || undefined,
          age:              age              || undefined,
          contact:          contact          || undefined,
          cardColor:        cardColor        || undefined,
          tileDescription:  tileDescription  || undefined,
        },
        status: "approved",
      });

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
