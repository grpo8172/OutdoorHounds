import { ScrollView, Text, View, Pressable, RefreshControl, ActivityIndicator, StyleSheet } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useMemo, useState } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { ProfileCard } from "@/components/profile-card";
import { useSwipeProfiles } from "@/hooks/use-swipe-profiles";
import { useActiveTenant } from "@/hooks/use-active-tenant";
import { mergeTenantModes } from "@/lib/tenant-modes";
import { AppMode } from "@/lib/mockData";
import { MODES } from "@/lib/modes";

const DEFAULT_BRAND_COLOR = "#e8843c";

export default function DiscoverScreen() {
  const { mode: modeParam } = useLocalSearchParams<{ mode: string }>();
  const { modeConfig: tenantModeConfig, brandColor } = useActiveTenant();
  const brand = brandColor ?? DEFAULT_BRAND_COLOR;

  const modeExists = MODES.some((m) => m.id === modeParam);
  const modes = useMemo(() => mergeTenantModes(tenantModeConfig), [tenantModeConfig]);
  const modeConfig = modes.find((m) => m.id === modeParam);

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

  if (!modeExists) {
    return (
      <ScreenContainer className="p-6 items-center justify-center">
        <Text className="text-lg text-foreground">Unknown category</Text>
      </ScreenContainer>
    );
  }

  // Exists generally, but this community has turned it off — distinct from
  // "unknown category" above, since this is a valid link that just doesn't
  // apply here right now (e.g. a stale deep link to a category the admin
  // has since disabled).
  if (!modeConfig) {
    return (
      <ScreenContainer className="p-6 items-center justify-center">
        <View className="items-center gap-4">
          <Text style={{ fontSize: 40 }}>🚫</Text>
          <Text className="text-lg font-bold text-foreground text-center">Not available here</Text>
          <Text className="text-sm text-muted text-center">
            This category isn't offered by this community.
          </Text>
          <Pressable
            onPress={() => router.back()}
            className="rounded-lg px-6 py-3 mt-2 active:opacity-80"
            style={{ backgroundColor: brand }}
          >
            <Text className="font-semibold" style={{ color: "#fff" }}>Go Back</Text>
          </Pressable>
        </View>
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
            style={{ backgroundColor: brand }}
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
              key={currentProfile.id}
              profile={currentProfile}
              onSwipeRight={swipeRight}
              onSwipeLeft={swipeLeft}
              currentIndex={currentIndex}
              totalProfiles={totalProfiles}
            />
          </View>

          {/* Skip / Save buttons */}
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Pressable
              onPress={swipeLeft}
              style={({ pressed }) => ({
                flex: 1, alignItems: "center", paddingVertical: 14, borderRadius: 14,
                backgroundColor: pressed ? "#fecaca" : "#fee2e2",
              })}
            >
              <Text style={{ color: "#dc2626", fontWeight: "700", fontSize: 16 }}>✕  Skip</Text>
            </Pressable>
            <Pressable
              onPress={swipeRight}
              style={({ pressed }) => ({
                flex: 1, alignItems: "center", paddingVertical: 14, borderRadius: 14,
                backgroundColor: pressed ? "#bbf7d0" : "#dcfce7",
              })}
            >
              <Text style={{ color: "#16a34a", fontWeight: "700", fontSize: 16 }}>♥  Save</Text>
            </Pressable>
          </View>

          {/* Saved count */}
          {savedListings.length > 0 && (
            <Text style={{ textAlign: "center", fontSize: 12, color: "#9ca3af" }}>
              {savedListings.length} saved so far
            </Text>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
