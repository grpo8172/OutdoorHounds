import { publicTenantProcedure, router } from "./_core/trpc";
import { DEFAULT_TENANT_ID, getTenantConfig } from "./db";

export const tenantRouter = router({
  // Resolves the currently active tenant (from X-Tenant-Slug, or the default
  // if absent) and returns just enough for the client to validate a join
  // link and render branding. Also doubles as the join-time validity check —
  // an unresolvable slug never reaches here, withTenant throws NOT_FOUND first.
  getActive: publicTenantProcedure.query(async ({ ctx }) => {
    const config = await getTenantConfig(ctx.tenantId);
    return {
      tenantId: ctx.tenantId,
      isDefault: ctx.tenantId === DEFAULT_TENANT_ID,
      businessName: config?.businessName ?? null,
      siteEmoji: config?.siteEmoji ?? null,
      slug: config?.slug ?? null,
      tagline: config?.tagline ?? null,
      brandColor: config?.brandColor ?? null,
      heroPhotos: (config?.heroPhotos as string[] | null) ?? [],
      modeConfig: (config?.modeConfig as Array<{ key: string; active: boolean; emoji: string; label: string }> | null) ?? [],
      chatGreeting: config?.chatGreeting ?? null,
      chatPlaceholder: config?.chatPlaceholder ?? null,
      chatDisclaimer: config?.chatDisclaimer ?? null,
    };
  }),
});
