import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { getProfileByUserId, updateProfile } from "./db";

const PROFILE_TYPES = [
  "individual",
  "rescue_group",
  "foster_carer",
  "pet_service_provider",
  "stall_holder",
  "event_organiser",
  "petting_zoo_provider",
] as const;

const BROWSING_MODES = [
  "adopt_or_foster",
  "pet_services",
  "pet_events",
  "stalls_and_shops",
  "lost_and_found",
  "mini_petting_zoo_bookings",
] as const;

export { PROFILE_TYPES, BROWSING_MODES };

export const profilesRouter = router({
  getMyProfile: protectedProcedure.query(async ({ ctx }) => {
    return getProfileByUserId(ctx.user.id);
  }),

  updateMyProfile: protectedProcedure
    .input(
      z.object({
        displayName: z.string().min(1).max(255).optional(),
        profileType: z.enum(PROFILE_TYPES).optional(),
        location: z.string().max(255).optional(),
        contactEmail: z.string().email().max(320).optional(),
        contactPhone: z.string().max(64).optional(),
        bio: z.string().optional(),
        preferredModesJson: z.array(z.enum(BROWSING_MODES)).optional(),
        profileMetaJson: z.record(z.unknown()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await updateProfile(ctx.user.id, input);
      return { success: true };
    }),
});
