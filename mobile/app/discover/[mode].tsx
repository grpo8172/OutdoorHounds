import { ScrollView, Text, View, Pressable, RefreshControl, ActivityIndicator } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { ProfileCard } from "@/components/profile-card";
import { useSwipeProfiles } from "@/hooks/use-swipe-profiles";
import { AppMode } from "@/lib/mockData";
import { MODES } from "@/lib/modes";

export default function DiscoverScreen() {
  const { mode: modeParam } = useLocalSearchParams<{ mode: string }>();
  const modeConfig = MODES.find((m) => m.id === modeParam);

  const {
    currentProfile,
    currentIndex,
    totalProfiles,
    savedListings,
    swipeRight,
    swipeLeft,
    reset,
    isLoading,
  } = useSwipeProfiles(modeConfig ? (modeParam as AppMode) : "adopt_or_foster");

  const [refreshing, setRefreshing] = useState(false);

  if (!modeConfig) {
    return (
      <ScreenContainer className="p-6 items-center justify-center">
        <Text className="text-lg text-foreground">Unknown category</Text>
      </ScreenContainer>
    );
  }

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      reset();
      setRefreshing(false);
    }, 500);
  };

  // Loading state while the DB query resolves
  if (isLoading) {
    return (
      <ScreenContainer className="items-center justify-center gap-3">
        <ActivityIndicator size="large" color="#0a7ea4" />
        <Text className="text-sm text-muted">Loading {modeConfig.title.toLowerCase()}...</Text>
      </ScreenContainer>
    );
  }

  // All listings swiped through
  if (!currentProfile) {
    return (
      <ScreenContainer className="p-6 items-center justify-center">
        <View className="items-center gap-4">
          <Text style={{ fontSize: 48 }}>{modeConfig.emoji}</Text>
          <Text className="text-3xl font-bold text-foreground">All done!</Text>
          <Text className="text-base text-muted text-center">
            You've viewed all {modeConfig.title.toLowerCase()} listings. Check back soon for more!
          </Text>
          <Pressable
            onPress={reset}
            className="rounded-lg px-6 py-3 mt-2 active:opacity-80"
            style={{ backgroundColor: "#e8843c" }}
          >
            <Text className="font-semibold" style={{ color: "#a8d4b8" }}>Start Over</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="p-6">
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ flexGrow: 1 }}
        scrollEnabled={false}
      >
        <View className="flex-1 gap-4">
          {/* Header */}
          <View className="flex-row items-center justify-between">
            <View className="gap-0.5">
              <Text className="text-2xl font-bold text-foreground">
                {modeConfig.emoji} {modeConfig.title}
              </Text>
              <Text className="text-sm text-muted">{modeConfig.subtitle}</Text>
            </View>
          </View>

          {/* Profile Card */}
          <View className="flex-1 justify-center">
            <ProfileCard
              profile={currentProfile}
              onSwipeRight={swipeRight}
              onSwipeLeft={swipeLeft}
              currentIndex={currentIndex}
              totalProfiles={totalProfiles}
            />
          </View>

          {/* Stats */}
          <View className="flex-row justify-between bg-surface rounded-lg p-4 border border-border">
            <View className="items-center">
              <Text className="text-2xl font-bold text-primary">{savedListings.length}</Text>
              <Text className="text-xs text-muted">Saved</Text>
            </View>
            <View className="items-center">
              <Text className="text-2xl font-bold text-foreground">{currentIndex + 1}</Text>
              <Text className="text-xs text-muted">Viewed</Text>
            </View>
            <View className="items-center">
              <Text className="text-2xl font-bold text-muted">
                {totalProfiles - currentIndex - 1}
              </Text>
              <Text className="text-xs text-muted">Remaining</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
