import { Image, Text, View, Pressable } from "react-native";
import { Profile } from "@/lib/mockData";
import { cn } from "@/lib/utils";

interface ProfileCardProps {
  profile: Profile;
  onPress?: () => void;
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
  currentIndex: number;
  totalProfiles: number;
}

export function ProfileCard({
  profile,
  onPress,
  onSwipeRight,
  onSwipeLeft,
  currentIndex,
  totalProfiles,
}: ProfileCardProps) {
  return (
    <Pressable
      onPress={onPress}
      className="w-full bg-surface rounded-2xl overflow-hidden shadow-md border border-border"
    >
      {/* Image Container */}
      <View className="w-full h-80 bg-muted relative">
        <Image
          source={{ uri: profile.images[0] }}
          className="w-full h-full"
          resizeMode="cover"
        />
        {/* Gradient Overlay */}
        <View className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Index Badge */}
        <View className="absolute top-3 right-3 bg-black/50 rounded-full px-3 py-1">
          <Text className="text-white text-xs font-semibold">
            {currentIndex + 1} / {totalProfiles}
          </Text>
        </View>
      </View>

      {/* Content Container */}
      <View className="p-4 gap-2">
        {/* Name and Type */}
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-2xl font-bold text-foreground">
              {profile.name}
            </Text>
            {profile.breed && (
              <Text className="text-sm text-muted">{profile.breed}</Text>
            )}
            {profile.age && (
              <Text className="text-sm text-muted">{profile.age} years old</Text>
            )}
          </View>
          {profile.rating && (
            <View className="items-center">
              <Text className="text-lg font-bold text-primary">
                ⭐ {profile.rating}
              </Text>
            </View>
          )}
        </View>

        {/* Location */}
        <View className="flex-row items-center gap-1">
          <Text className="text-sm text-muted">📍</Text>
          <Text className="text-sm text-muted">
            {profile.location}
            {profile.distance && ` • ${profile.distance}km away`}
          </Text>
        </View>

        {/* Description */}
        <Text className="text-sm text-foreground leading-relaxed mt-2">
          {profile.description.substring(0, 100)}
          {profile.description.length > 100 ? "..." : ""}
        </Text>

        {/* Price (if service) */}
        {profile.price && (
          <Text className="text-sm font-semibold text-primary mt-2">
            {profile.price}
          </Text>
        )}

        {/* Action Buttons */}
        <View className="flex-row gap-3 mt-4">
          <Pressable
            onPress={onSwipeLeft}
            className="flex-1 bg-error/10 rounded-lg py-2 items-center active:opacity-70"
          >
            <Text className="text-error font-semibold">Skip</Text>
          </Pressable>
          <Pressable
            onPress={onSwipeRight}
            className="flex-1 bg-success/10 rounded-lg py-2 items-center active:opacity-70"
          >
            <Text className="text-success font-semibold">Save for later</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}
