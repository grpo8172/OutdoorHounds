import { and, eq, inArray, ne, sql, isNotNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { catalogueItems } from "../drizzle/schema";
import { getDb, getProfileByUserId, getTenantConfig, consumeWriteQuota, PAID_DAILY_WRITE_LIMIT } from "./db";
import { adminProcedure, protectedProcedure, protectedTenantProcedure, publicProcedure, publicTenantProcedure, writeProcedure, enforceListingPaywall, router } from "./_core/trpc";
import { ENV } from "./_core/env";

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
// "pet_events" rolls up event/hike/petting_zoo_booking for backwards compat
// (the default tenant's static, unmerged browsing experience). The three
// underlying types are also individually addressable so a non-default
// tenant that's customised them differently can browse them as independent
// cards instead — see lib/tenant-modes.ts on the client.
const MODE_TO_ITEM_TYPE: Record<string, string> = {
  adopt_or_foster: "pet",
  pet_services:    "service",
  pet_events:      "event",
  stalls_and_shops: "stall",
  lost_and_found:  "lost_found",
  event:               "event",
  hike:                "hike",
  petting_zoo_booking: "petting_zoo_booking",
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
  listByMode: publicTenantProcedure
    .input(
      z.object({
        mode: z.enum([
          "adopt_or_foster",
          "pet_services",
          "pet_events",
          "stalls_and_shops",
          "lost_and_found",
          "event",
          "hike",
          "petting_zoo_booking",
        ]),
        lat: z.number().optional(),
        lng: z.number().optional(),
        radiusKm: z.number().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const types = LEGACY_ITEM_TYPES[input.mode] ?? [MODE_TO_ITEM_TYPE[input.mode]];

      const conditions = [
        eq(catalogueItems.status, "approved"),
        inArray(catalogueItems.itemType, types),
        eq(catalogueItems.tenantId, ctx.tenantId),
      ];

      // Don't show a user their own listing in their own swipe feed —
      // ctx.user is optional here (publicTenantProcedure), so only guests
      // who are logged in get this filter; anonymous guests have no
      // listings to exclude anyway.
      if (ctx.user) {
        conditions.push(ne(catalogueItems.userId, ctx.user.id));
      }

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
   * listingMeta JSON. A completed profile is re-checked here since the
   * client-side gate on /create-listing can't be trusted on its own.
   * Uses protectedTenantProcedure (not writeTenantProcedure) rather than
   * the blanket per-user payment gate, since whether payment is required
   * here also depends on the tenant + mode (see the free-listings check
   * below) — enforceListingPaywall is called manually once that's known.
   */
  submit: protectedTenantProcedure
    .input(
      z.object({
        mode: z.enum([
          "adopt_or_foster",
          "pet_services",
          "pet_events",
          "stalls_and_shops",
          "lost_and_found",
          "event",
          "hike",
          "petting_zoo_booking",
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

      const tenantConfig = await getTenantConfig(ctx.tenantId);
      if (tenantConfig?.allowPublicListings === false) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This business isn't accepting public listing submissions.",
        });
      }

      // A tenant can waive the paid listing fee, but only for adopt/foster
      // posts (e.g. a shelter's community link) — every other mode on the
      // same tenant still goes through the normal payment gate.
      const isFreeAdoptionListing = !!tenantConfig?.freeListings && input.mode === "adopt_or_foster";
      if (!isFreeAdoptionListing) {
        await enforceListingPaywall(ctx.user);
      } else if (ENV.isProduction) {
        // Not a payment check — just keeps the free path metered at the
        // same generous cap a paying user gets, instead of unmetered.
        const allowed = await consumeWriteQuota(ctx.user.id, PAID_DAILY_WRITE_LIMIT);
        if (!allowed) {
          throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Daily listing limit reached. Try again tomorrow." });
        }
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { mode, imageUrls, videoUrl, location, breed, age, contact, cardColor, tileDescription, ...rest } = input;
      const photos = imageUrls?.filter(Boolean) ?? [];

      const coords = location ? await geocode(location) : null;

      await db.insert(catalogueItems).values({
        ...rest,
        userId: ctx.user.id,
        tenantId: ctx.tenantId,
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
