import { useCallback, useEffect, useState } from "react";
import { usePathname } from "expo-router";
import * as Tenant from "@/lib/_core/tenant";
import { trpc } from "@/lib/trpc";
import { isTenantNotFoundError } from "@/lib/trpc-error";
import { useAuth } from "@/hooks/use-auth";

const WEB_BASE_URL = process.env.EXPO_PUBLIC_WEB_URL || "http://localhost:8000";

// hero_photos entries may be a relative path (the web business site's own
// local-disk-served /api/photos/<file> route, from before it moved to GCS)
// or an absolute GCS URL — resolve the former against the web site's origin
// so RN's <Image> (which has no browser-style relative-URL resolution) gets
// something it can actually load.
function resolvePhotoUrl(url: string | null): string | null {
  if (!url) return null;
  return url.startsWith("http") ? url : `${WEB_BASE_URL}${url}`;
}

// Tracks whether this session is currently scoped to a non-default tenant
// (see app/t/[slug].tsx for how one gets joined). Self-heals if the
// persisted slug ever stops resolving (tenant deleted, etc.) — without
// this, every tenant-aware call would 404 forever with no in-app recovery.
export function useActiveTenant() {
  const pathname = usePathname();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [slug, setSlug] = useState<string | null | undefined>(undefined);

  // A signed-in tenant owner should land on their OWN site by default,
  // rather than the platform default or whatever tenant this device last
  // joined (e.g. from testing/visiting another business's storefront) —
  // but an explicit /t/:slug visit (app/t/[slug].tsx, which itself calls
  // Tenant.setTenantSlug) always wins over this auto-join.
  const onExplicitTenantRoute = pathname.startsWith("/t/");
  const ownedTenantQuery = trpc.subscriptions.getAdminStatus.useQuery(undefined, {
    enabled: isAuthenticated && !onExplicitTenantRoute,
  });

  useEffect(() => {
    if (onExplicitTenantRoute) {
      Tenant.getTenantSlug().then(setSlug);
      return;
    }
    if (authLoading) return;
    if (isAuthenticated) {
      if (ownedTenantQuery.isLoading) return;
      if (ownedTenantQuery.data?.slug) {
        const ownedSlug = ownedTenantQuery.data.slug;
        Tenant.setTenantSlug(ownedSlug).then(() => setSlug(ownedSlug));
        return;
      }
    }
    Tenant.getTenantSlug().then(setSlug);
  }, [onExplicitTenantRoute, authLoading, isAuthenticated, ownedTenantQuery.isLoading, ownedTenantQuery.data]);

  const query = trpc.tenant.getActive.useQuery(undefined, {
    enabled: !!slug,
    retry: false,
  });

  useEffect(() => {
    if (query.error && isTenantNotFoundError(query.error)) {
      Tenant.clearTenantSlug();
      setSlug(null);
    }
  }, [query.error]);

  const leave = useCallback(async () => {
    await Tenant.clearTenantSlug();
    setSlug(null);
  }, []);

  const isDefault = !query.data || query.data.isDefault;

  return {
    isNonDefault: !!slug && !!query.data && !query.data.isDefault,
    businessName: query.data?.businessName ?? null,
    siteEmoji: query.data?.siteEmoji ?? null,
    slug: query.data?.slug ?? null,
    // Safe for every tenant, including the default — tenant 1's DB values
    // already equal today's hardcoded look (verified against prod), so
    // there's no gating needed here, unlike tagline/modeConfig below.
    brandColor: query.data?.brandColor ?? null,
    bannerColor: query.data?.bannerColor ?? null,
    backgroundColor: query.data?.backgroundColor ?? null,
    heroPhoto: resolvePhotoUrl(query.data?.heroPhotos?.[0] ?? null),
    // Tenant 1's tagline/category labels in the DB don't match this app's
    // own hardcoded copy — only apply them for a real (non-default) tenant,
    // so the default experience stays byte-for-byte unchanged.
    tagline: isDefault ? null : (query.data?.tagline ?? null),
    modeConfig: isDefault ? null : (query.data?.modeConfig ?? null),
    chatGreeting: query.data?.chatGreeting ?? null,
    chatPlaceholder: query.data?.chatPlaceholder ?? null,
    chatDisclaimer: query.data?.chatDisclaimer ?? null,
    allowPublicListings: query.data?.allowPublicListings ?? true,
    leave,
  };
}
