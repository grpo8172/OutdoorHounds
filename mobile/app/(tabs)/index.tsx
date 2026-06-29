import { ScrollView, Text, View, Pressable, RefreshControl } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { ProfileCard } from "@/components/profile-card";
import { useSwipeProfiles } from "@/hooks/use-swipe-profiles";
import { useState } from "react";

export default function HomeScreen() {
  const {
    currentProfile,
    currentIndex,
    totalProfiles,
    likedProfiles,
    swipeRight,
    swipeLeft,
    reset,
  } = useSwipeProfiles();

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      reset();
      setRefreshing(false);
    }, 500);
  };

  if (!currentProfile) {
    return (
      <ScreenContainer className="p-6 items-center justify-center">
        <View className="items-center gap-4">
          <Text className="text-3xl font-bold text-foreground">
            No More Profiles
          </Text>
          <Text className="text-base text-muted text-center">
            You've viewed all available profiles. Check back soon for more!
          </Text>
          <Pressable
            onPress={reset}
            className="bg-primary rounded-lg px-6 py-3 mt-4 active:opacity-80"
          >
            <Text className="text-background font-semibold">Start Over</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="p-6">
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{ flexGrow: 1 }}
        scrollEnabled={false}
      >
        <View className="flex-1 gap-4">
          {/* Header */}
          <View className="gap-1">
            <Text className="text-3xl font-bold text-foreground">
              Discover
            </Text>
            <Text className="text-sm text-muted">
              Swipe to find your next adventure buddy
            </Text>
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
              <Text className="text-2xl font-bold text-primary">
                {likedProfiles.length}
              </Text>
              <Text className="text-xs text-muted">Liked</Text>
            </View>
            <View className="items-center">
              <Text className="text-2xl font-bold text-foreground">
                {currentIndex + 1}
              </Text>
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
