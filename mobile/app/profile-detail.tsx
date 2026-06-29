import { ScrollView, Text, View, Pressable, Image, FlatList } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { mockProfiles } from "@/lib/mockData";
import { useState } from "react";

export default function ProfileDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const profile = mockProfiles.find((p) => p.id === id);

  if (!profile) {
    return (
      <ScreenContainer className="p-6 items-center justify-center">
        <Text className="text-lg text-foreground">Profile not found</Text>
        <Pressable
          onPress={() => router.back()}
          className="mt-4 bg-primary rounded-lg px-6 py-3 active:opacity-80"
        >
          <Text className="text-background font-semibold">Go Back</Text>
        </Pressable>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="p-0">
      <ScrollView className="flex-1">
        {/* Image Carousel */}
        <View className="w-full h-96 bg-muted relative">
          <Image
            source={{ uri: profile.images[currentImageIndex] }}
            className="w-full h-full"
            resizeMode="cover"
          />
          {/* Image Counter */}
          <View className="absolute bottom-3 right-3 bg-black/50 rounded-full px-3 py-1">
            <Text className="text-white text-xs font-semibold">
              {currentImageIndex + 1} / {profile.images.length}
            </Text>
          </View>
        </View>

        {/* Thumbnail Navigation */}
        {profile.images.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="px-4 py-3"
            contentContainerStyle={{ gap: 8 }}
          >
            {profile.images.map((image, index) => (
              <Pressable
                key={index}
                onPress={() => setCurrentImageIndex(index)}
                className={`rounded-lg overflow-hidden border-2 ${
                  index === currentImageIndex ? "border-primary" : "border-border"
                }`}
              >
                <Image
                  source={{ uri: image }}
                  className="w-16 h-16"
                  resizeMode="cover"
                />
              </Pressable>
            ))}
          </ScrollView>
        )}

        {/* Content */}
        <View className="px-4 py-6 gap-4">
          {/* Header */}
          <View className="gap-2">
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-3xl font-bold text-foreground">
                  {profile.name}
                </Text>
                {profile.breed && (
                  <Text className="text-base text-muted">{profile.breed}</Text>
                )}
                {profile.age && (
                  <Text className="text-base text-muted">
                    {profile.age} years old
                  </Text>
                )}
              </View>
              {profile.rating && (
                <View className="items-center">
                  <Text className="text-2xl font-bold text-primary">
                    ⭐
                  </Text>
                  <Text className="text-sm font-semibold text-primary">
                    {profile.rating}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Location */}
          <View className="flex-row items-center gap-2 bg-surface rounded-lg p-3 border border-border">
            <Text className="text-lg">📍</Text>
            <View className="flex-1">
              <Text className="text-sm text-muted">Location</Text>
              <Text className="text-base font-semibold text-foreground">
                {profile.location}
              </Text>
              {profile.distance && (
                <Text className="text-sm text-muted">
                  {profile.distance}km away
                </Text>
              )}
            </View>
          </View>

          {/* Description */}
          <View className="gap-2">
            <Text className="text-sm font-semibold text-muted uppercase">
              About
            </Text>
            <Text className="text-base text-foreground leading-relaxed">
              {profile.description}
            </Text>
          </View>

          {/* Price (if service) */}
          {profile.price && (
            <View className="bg-primary/10 rounded-lg p-4 gap-2">
              <Text className="text-sm font-semibold text-muted uppercase">
                Pricing
              </Text>
              <Text className="text-lg font-bold text-primary">
                {profile.price}
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <View className="gap-3 mt-4">
            <Pressable className="bg-primary rounded-lg py-3 items-center active:opacity-80">
              <Text className="text-background font-semibold text-base">
                {profile.type === "service" ? "Book Service" : "Show Interest"}
              </Text>
            </Pressable>
            <Pressable className="bg-surface border border-border rounded-lg py-3 items-center active:opacity-70">
              <Text className="text-foreground font-semibold">Share</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
