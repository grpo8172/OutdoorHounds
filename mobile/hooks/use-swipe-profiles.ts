import { useState, useCallback } from "react";
import { Profile, mockProfiles } from "@/lib/mockData";

export interface UseSwipeProfilesReturn {
  currentProfile: Profile | null;
  currentIndex: number;
  totalProfiles: number;
  likedProfiles: Profile[];
  passedProfiles: Profile[];
  swipeRight: () => void;
  swipeLeft: () => void;
  reset: () => void;
  removeLiked: (id: string) => void;
}

export function useSwipeProfiles(): UseSwipeProfilesReturn {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likedProfiles, setLikedProfiles] = useState<Profile[]>([]);
  const [passedProfiles, setPassedProfiles] = useState<Profile[]>([]);

  const currentProfile = mockProfiles[currentIndex] || null;

  const swipeRight = useCallback(() => {
    if (currentProfile) {
      setLikedProfiles((prev) => [...prev, currentProfile]);
    }
    setCurrentIndex((prev) => prev + 1);
  }, [currentProfile]);

  const swipeLeft = useCallback(() => {
    if (currentProfile) {
      setPassedProfiles((prev) => [...prev, currentProfile]);
    }
    setCurrentIndex((prev) => prev + 1);
  }, [currentProfile]);

  const reset = useCallback(() => {
    setCurrentIndex(0);
    setLikedProfiles([]);
    setPassedProfiles([]);
  }, []);

  const removeLiked = useCallback((id: string) => {
    setLikedProfiles((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return {
    currentProfile,
    currentIndex,
    totalProfiles: mockProfiles.length,
    likedProfiles,
    passedProfiles,
    swipeRight,
    swipeLeft,
    reset,
    removeLiked,
  };
}
