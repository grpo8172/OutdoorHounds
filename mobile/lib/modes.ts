import { AppMode } from "@/lib/mockData";

export const MODES = [
  {
    id: "adopt_or_foster" as AppMode,
    title: "Adopt & Foster",
    subtitle: "Give a pet a loving home",
    emoji: "🐾",
    image: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&h=300&fit=crop",
  },
  {
    id: "pet_services" as AppMode,
    title: "Pet Services",
    subtitle: "Trusted care near you",
    emoji: "🏡",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&h=300&fit=crop",
  },
  {
    id: "pet_events" as AppMode,
    title: "Pet Events",
    subtitle: "Join the community",
    emoji: "🎉",
    image: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=600&h=300&fit=crop",
  },
  {
    id: "stalls_and_shops" as AppMode,
    title: "Stalls & Shops",
    subtitle: "Discover pet products",
    emoji: "🛍️",
    image: "https://images.unsplash.com/photo-1601758124510-52d02ddb7cbd?w=600&h=300&fit=crop",
  },
  {
    id: "lost_and_found" as AppMode,
    title: "Lost & Found",
    subtitle: "Help reunite pets",
    emoji: "🔍",
    image: "https://images.unsplash.com/photo-1601758125946-6ec2ef64daf8?w=600&h=300&fit=crop",
  },
] as const;

// Fields shown per mode in the create form
export const MODE_FIELDS: Record<AppMode, { showBreed: boolean; showAge: boolean; showContact: boolean }> = {
  adopt_or_foster:  { showBreed: true,  showAge: true,  showContact: false },
  pet_services:     { showBreed: false, showAge: false, showContact: false },
  pet_events:       { showBreed: false, showAge: false, showContact: false },
  stalls_and_shops: { showBreed: false, showAge: false, showContact: false },
  lost_and_found:   { showBreed: true,  showAge: false, showContact: true  },
};
