import { useState, useCallback } from "react";
import { Profile, mockProfiles } from "@/lib/mockData";

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
}

export function useSwipeProfiles(): UseSwipeProfilesReturn {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [savedListings, setSavedListings] = useState<Profile[]>([]);
  const [skippedListings, setSkippedListings] = useState<Profile[]>([]);

  const currentProfile = mockProfiles[currentIndex] || null;

  const swipeRight = useCallback(() => {
    if (currentProfile) {
      setSavedListings((prev) => [...prev, currentProfile]);
    }
    setCurrentIndex((prev) => prev + 1);
  }, [currentProfile]);

  const swipeLeft = useCallback(() => {
    if (currentProfile) {
      setSkippedListings((prev) => [...prev, currentProfile]);
    }
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
    totalProfiles: mockProfiles.length,
    savedListings,
    skippedListings,
    swipeRight,
    swipeLeft,
    reset,
    removeSaved,
  };
}
