import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { Profile, AppMode, mockProfiles } from "@/lib/mockData";
import { trpc } from "@/lib/trpc";
import { useAuth } from "./use-auth";
import { useLocation } from "@/lib/location-context";
import { useActiveTenant } from "./use-active-tenant";

// Swipe progress (saved/skipped) previously lived only in this hook's local
// useState, which is torn down and recreated every time DiscoverScreen
// unmounts — i.e. every time you back out to the menu and re-enter a
// category. That made "already seen" listings reappear at the front of the
// deck, in the same order, as if nothing had happened. This module-level
// cache keeps saved/skipped listings alive for the life of the app session,
// keyed by tenant + mode so progress in one community/category never bleeds
// into another.
const swipeStateCache = new Map<string, { savedListings: Profile[]; skippedListings: Profile[] }>();

// Reverse mapping: itemType stored in DB → AppMode used in the client
const ITEM_TYPE_TO_MODE: Record<string, AppMode> = {
  pet:                   "adopt_or_foster",
  service:               "pet_services",
  event:                 "pet_events",
  hike:                  "pet_events",
  petting_zoo_booking:   "pet_events",
  stall:                 "stalls_and_shops",
  lost_found:            "lost_and_found",
};

const ITEM_TYPE_TO_PROFILE_TYPE: Record<string, Profile["type"]> = {
  pet:                 "dog",
  lost_found:          "dog",
  service:             "service",
  hike:                "event",
  petting_zoo_booking: "event",
  event:               "event",
  stall:               "stall",
};

type FeedItem = {
  id: number;
  itemType: string;
  name: string;
  description: string;
  price?: string | null;
  imageUrl?: string | null;
  listingMeta: unknown;
};

function catalogueItemToProfile(item: FeedItem): Profile {
  const meta = (item.listingMeta as Record<string, any>) ?? {};
  const photos: string[] = Array.isArray(meta.photos) ? meta.photos : [];
  const images = [
    ...(item.imageUrl ? [item.imageUrl] : []),
    ...photos.filter((p: string) => p !== item.imageUrl),
  ].filter(Boolean) as string[];

  return {
    id: `db_${item.id}`,
    name: item.name,
    type: ITEM_TYPE_TO_PROFILE_TYPE[item.itemType] ?? "service",
    mode: ITEM_TYPE_TO_MODE[item.itemType] ?? "adopt_or_foster",
    breed: meta.breed ?? undefined,
    age: typeof meta.age === "number" ? meta.age : undefined,
    location: meta.location ?? "Local area",
    description: item.description,
    images,
    videoUrl: meta.videoUrl ?? undefined,
    price: item.price ?? undefined,
    rating: typeof meta.rating === "number" ? meta.rating : undefined,
    cardColor: typeof meta.cardColor === "string" ? meta.cardColor : undefined,
    tileDescription: typeof meta.tileDescription === "string" ? meta.tileDescription : undefined,
  };
}

export interface UseSwipeProfilesReturn {
  currentProfile: Profile | null;
  currentIndex: number;
  totalProfiles: number;
  savedListings: Profile[];
  skippedListings: Profile[];
  swipeRight: () => void;
  swipeLeft: () => void;
  reset: () => void;
  removeSaved: (id: string) => void;
  isLoading: boolean;
}

export function useSwipeProfiles(mode: AppMode = "adopt_or_foster"): UseSwipeProfilesReturn {
  const { user } = useAuth();
  const { lat, lng, radiusKm, enabled: locationEnabled } = useLocation();
  const { isNonDefault, slug } = useActiveTenant();
  const cacheKey = `${slug ?? "default"}:${mode}`;
  const saveItemMutation = trpc.messages.saveItem.useMutation({
    // Swiping is a background action — don't interrupt the swipe flow with
    // a modal. The listing is still marked saved locally either way; a
    // failed save (paywall/guest-limit/etc.) just won't persist server-side.
    onError: (err) => {
      console.warn("[useSwipeProfiles] saveItem failed:", err.message);
    },
  });

  const query = trpc.items.listByMode.useQuery(
    {
      mode,
      lat: locationEnabled && lat != null ? lat : undefined,
      lng: locationEnabled && lng != null ? lng : undefined,
      radiusKm: locationEnabled ? radiusKm : undefined,
    },
    {
      retry: false,
      staleTime: 60_000,
    },
  );

  const dbProfiles = useMemo(
    () => (query.data ?? []).map(catalogueItemToProfile),
    [query.data],
  );

  const mockFiltered = useMemo(
    () => mockProfiles.filter((p) => p.mode === mode),
    [mode],
  );

  // While loading: show nothing (DiscoverScreen renders a spinner).
  // Once resolved (success or error): DB profiles first, then mock profiles
  // as filler — except inside a non-default tenant's community, where the
  // original app's placeholder pets/services would otherwise bleed into
  // what's supposed to feel like her own dedicated feed.
  const allProfiles = useMemo(
    () => (query.isLoading ? [] : [...dbProfiles, ...(isNonDefault ? [] : mockFiltered)]),
    [query.isLoading, dbProfiles, mockFiltered, isNonDefault],
  );

  const [savedListings, setSavedListings] = useState<Profile[]>([]);
  const [skippedListings, setSkippedListings] = useState<Profile[]>([]);

  // Reload from the cache whenever we land on a new tenant+mode bucket
  // (including the async case where the active tenant's slug resolves a
  // beat after mount, changing cacheKey from the "default" bucket to the
  // real one).
  const loadedKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (loadedKeyRef.current === cacheKey) return;
    loadedKeyRef.current = cacheKey;
    const cached = swipeStateCache.get(cacheKey);
    setSavedListings(cached?.savedListings ?? []);
    setSkippedListings(cached?.skippedListings ?? []);
  }, [cacheKey]);

  useEffect(() => {
    swipeStateCache.set(cacheKey, { savedListings, skippedListings });
  }, [cacheKey, savedListings, skippedListings]);

  // Filter out anything already saved/skipped (rather than tracking a raw
  // index into allProfiles) so resuming a category picks up with the next
  // unseen listing regardless of how many were swiped in a prior visit.
  const seenIds = useMemo(
    () => new Set([...savedListings, ...skippedListings].map((p) => p.id)),
    [savedListings, skippedListings],
  );
  const visibleProfiles = useMemo(
    () => allProfiles.filter((p) => !seenIds.has(p.id)),
    [allProfiles, seenIds],
  );

  const currentProfile = visibleProfiles[0] ?? null;
  const currentIndex = savedListings.length + skippedListings.length;

  const swipeRight = useCallback(() => {
    if (currentProfile) {
      setSavedListings((prev) => [...prev, currentProfile]);
      if (user && currentProfile.id.startsWith("db_")) {
        const itemId = parseInt(currentProfile.id.replace("db_", ""), 10);
        if (!isNaN(itemId)) saveItemMutation.mutate({ itemId });
      }
    }
  }, [currentProfile, user, saveItemMutation]);

  const swipeLeft = useCallback(() => {
    if (currentProfile) setSkippedListings((prev) => [...prev, currentProfile]);
  }, [currentProfile]);

  const reset = useCallback(() => {
    setSavedListings([]);
    setSkippedListings([]);
  }, []);

  const removeSaved = useCallback((id: string) => {
    setSavedListings((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return {
    currentProfile,
    currentIndex,
    totalProfiles: allProfiles.length,
    savedListings,
    skippedListings,
    swipeRight,
    swipeLeft,
    reset,
    removeSaved,
    isLoading: query.isLoading,
  };
}
