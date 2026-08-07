import { useCallback, useEffect, useState } from "react";
import { usePathname } from "expo-router";
import * as Tenant from "@/lib/_core/tenant";
import { trpc } from "@/lib/trpc";
import { isTenantNotFoundError } from "@/lib/trpc-error";

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
//
// Deliberately NOT auto-joining a signed-in owner to their own tenant here
// (an earlier version of this hook did, on a device's first-ever load).
// That silently took owners off the default app the moment they signed in
// on a fresh device/browser, with no way back except finding and tapping
// "Leave" — invisible friction for an owner who also just wants to use the
// platform normally under the same account. The only way to end up on a
// non-default tenant now is the explicit path: visiting a /t/<slug> link.
export function useActiveTenant() {
  const pathname = usePathname();
  const utils = trpc.useUtils();
  const [slug, setSlug] = useState<string | null | undefined>(undefined);

  const onExplicitTenantRoute = pathname.startsWith("/t/");

  useEffect(() => {
    // app/t/[slug].tsx already persists the slug via setTenantSlug before
    // routing here, so re-reading storage on every pathname change (rather
    // than trusting the route param directly) picks that up uniformly,
    // whether we just joined or are resuming an already-joined session.
    Tenant.getTenantSlug().then(setSlug);
  }, [onExplicitTenantRoute]);

  const query = trpc.tenant.getActive.useQuery(undefined, {
    enabled: !!slug,
    retry: false,
  });

  useEffect(() => {
    if (query.error && isTenantNotFoundError(query.error)) {
      Tenant.clearTenantSlug();
      setSlug(null);
      utils.tenant.getActive.reset();
    }
  }, [query.error, utils]);

  const leave = useCallback(async () => {
    await Tenant.clearTenantSlug();
    setSlug(null);
    // The active tenant is resolved server-side from an X-Tenant-Slug header,
    // not part of this query's cache key, so React Query has no way to know
    // the previous tenant's cached data is now stale — without this reset,
    // the old tenant's branding/hero photo/name would linger on screen until
    // a full page reload wiped the whole cache.
    await utils.tenant.getActive.reset();
  }, [utils]);

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
    freeListings: query.data?.freeListings ?? false,
    leave,
  };
}
