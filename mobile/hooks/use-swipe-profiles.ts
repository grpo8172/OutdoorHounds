import { useState, useCallback, useMemo } from "react";
import { Profile, AppMode, mockProfiles } from "@/lib/mockData";
import { trpc } from "@/lib/trpc";
import { useAuth } from "./use-auth";
import { useLocation } from "@/lib/location-context";

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
  const saveItemMutation = trpc.messages.saveItem.useMutation();

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
  // Once resolved (success or error): DB profiles first, then mock profiles as fallback.
  const allProfiles = useMemo(
    () => (query.isLoading ? [] : [...dbProfiles, ...mockFiltered]),
    [query.isLoading, dbProfiles, mockFiltered],
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [savedListings, setSavedListings] = useState<Profile[]>([]);
  const [skippedListings, setSkippedListings] = useState<Profile[]>([]);

  const currentProfile = allProfiles[currentIndex] ?? null;

  const swipeRight = useCallback(() => {
    if (currentProfile) {
      setSavedListings((prev) => [...prev, currentProfile]);
      if (user && currentProfile.id.startsWith("db_")) {
        const itemId = parseInt(currentProfile.id.replace("db_", ""), 10);
        if (!isNaN(itemId)) saveItemMutation.mutate({ itemId });
      }
    }
    setCurrentIndex((prev) => prev + 1);
  }, [currentProfile, user, saveItemMutation]);

  const swipeLeft = useCallback(() => {
    if (currentProfile) setSkippedListings((prev) => [...prev, currentProfile]);
    setCurrentIndex((prev) => prev + 1);
  }, [currentProfile]);

  const reset = useCallback(() => {
    setCurrentIndex(0);
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
