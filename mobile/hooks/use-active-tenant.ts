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
  const utils = trpc.useUtils();
  const [slug, setSlug] = useState<string | null | undefined>(undefined);

  // Whether this device has EVER recorded a tenant decision before (joined
  // one, or explicitly left one via leave()) — undefined until the initial
  // async check resolves. This is deliberately read from durable storage
  // (Tenant.hasMadeTenantChoice), not an in-memory ref: a plain in-memory
  // "already handled this" flag would reset on every page refresh, which is
  // exactly when this used to misfire (see below).
  const [hasMadeChoice, setHasMadeChoice] = useState<boolean | undefined>(undefined);

  const onExplicitTenantRoute = pathname.startsWith("/t/");

  useEffect(() => {
    if (onExplicitTenantRoute) {
      // app/t/[slug].tsx already persisted this visit via setTenantSlug
      // before routing here — a real decision has been made.
      setHasMadeChoice(true);
      return;
    }
    Tenant.hasMadeTenantChoice().then(setHasMadeChoice);
  }, [onExplicitTenantRoute]);

  // A signed-in tenant owner should land on their OWN site by default the
  // FIRST time ever on a device — rather than the platform default — but
  // this must fire at most once per device, ever. Gating it only on "not
  // currently on an explicit /t/:slug route" (as this used to) re-triggered
  // on every navigation away from that route, silently undoing leave() and
  // reverting an in-progress visit to someone else's tenant back to the
  // owner's own site on refresh/back-navigation, since app/t/[slug].tsx
  // itself redirects to /(tabs) right after joining. Gating on
  // hasMadeChoice === false instead means: once ANY decision exists for
  // this device (joined, or explicitly left), it's respected from then on.
  const shouldAutoJoinOwnTenant = isAuthenticated && !onExplicitTenantRoute && hasMadeChoice === false;
  const ownedTenantQuery = trpc.subscriptions.getAdminStatus.useQuery(undefined, {
    enabled: shouldAutoJoinOwnTenant,
  });

  useEffect(() => {
    if (onExplicitTenantRoute) {
      Tenant.getTenantSlug().then(setSlug);
      return;
    }
    if (authLoading || hasMadeChoice === undefined) return;
    if (shouldAutoJoinOwnTenant) {
      if (ownedTenantQuery.isLoading) return;
      if (ownedTenantQuery.data?.slug) {
        const ownedSlug = ownedTenantQuery.data.slug;
        Tenant.setTenantSlug(ownedSlug).then(() => setSlug(ownedSlug));
        setHasMadeChoice(true);
        return;
      }
    }
    Tenant.getTenantSlug().then(setSlug);
  }, [onExplicitTenantRoute, authLoading, hasMadeChoice, shouldAutoJoinOwnTenant, ownedTenantQuery.isLoading, ownedTenantQuery.data]);

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
    setHasMadeChoice(true);
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
    leave,
  };
}
