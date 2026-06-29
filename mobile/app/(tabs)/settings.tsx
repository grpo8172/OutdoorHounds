import { ScrollView, Text, View, Pressable, Switch, Alert } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { router } from "expo-router";
import { useState } from "react";

const PROFILE_TYPE_LABELS: Record<string, string> = {
  individual: "Individual",
  rescue_group: "Rescue Group",
  foster_carer: "Foster Carer",
  pet_service_provider: "Pet Service Provider",
  stall_holder: "Stall Holder",
  event_organiser: "Event Organiser",
  petting_zoo_provider: "Mini Petting Zoo Provider",
};

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [maxDistance, setMaxDistance] = useState("25");

  const profileQuery = trpc.profiles.getMyProfile.useQuery(undefined, {
    enabled: !!user,
  });
  const profile = profileQuery.data;

  async function handleLogout() {
    await logout();
    router.replace("/(tabs)");
  }

  function handleEditProfile() {
    router.push("/onboarding");
  }

  return (
    <ScreenContainer className="p-0">
      <ScrollView className="flex-1">
        {/* Header */}
        <View className="px-6 py-6 gap-1 bg-background">
          <Text className="text-3xl font-bold text-foreground">Settings</Text>
          <Text className="text-sm text-muted">Customize your experience</Text>
        </View>

        {/* Profile card */}
        {user && (
          <View className="px-6 pb-4">
            <Pressable
              onPress={handleEditProfile}
              className="bg-surface rounded-lg p-4 border border-border gap-1 active:opacity-70"
            >
              <View className="flex-row justify-between items-start">
                <View className="flex-1 gap-1">
                  <Text className="text-base font-bold text-foreground">
                    {profile?.displayName ?? user.name ?? "My Profile"}
                  </Text>
                  {profile?.profileType && (
                    <Text className="text-sm text-muted">
                      {PROFILE_TYPE_LABELS[profile.profileType] ?? profile.profileType}
                    </Text>
                  )}
                  {profile?.location && (
                    <Text className="text-xs text-muted">{profile.location}</Text>
                  )}
                </View>
                <Text className="text-xs text-primary font-semibold">Edit</Text>
              </View>
            </Pressable>
          </View>
        )}

        {/* Preferences Section */}
        <View className="px-6 py-4 gap-4">
          {/* Notifications */}
          <View className="bg-surface rounded-lg p-4 border border-border flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-base font-semibold text-foreground">Notifications</Text>
              <Text className="text-sm text-muted mt-1">Get alerts for new matches</Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: "#767577", true: "#81c784" }}
            />
          </View>

          {/* Dark Mode */}
          <View className="bg-surface rounded-lg p-4 border border-border flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-base font-semibold text-foreground">Dark Mode</Text>
              <Text className="text-sm text-muted mt-1">Easy on the eyes</Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: "#767577", true: "#81c784" }}
            />
          </View>

          {/* Distance Filter */}
          <View className="bg-surface rounded-lg p-4 border border-border">
            <Text className="text-base font-semibold text-foreground mb-3">Search Radius</Text>
            <View className="flex-row gap-2 flex-wrap">
              {["5", "10", "25", "50"].map((distance) => (
                <Pressable
                  key={distance}
                  onPress={() => setMaxDistance(distance)}
                  className={`rounded-lg px-4 py-2 ${
                    maxDistance === distance
                      ? "bg-primary"
                      : "bg-background border border-border"
                  }`}
                >
                  <Text
                    className={`font-semibold ${
                      maxDistance === distance ? "text-background" : "text-foreground"
                    }`}
                  >
                    {distance}km
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* About Section */}
        <View className="px-6 py-4 gap-4 mt-4">
          <Text className="text-sm font-semibold text-muted uppercase">About</Text>

          <Pressable className="bg-surface rounded-lg p-4 border border-border active:opacity-70">
            <Text className="text-base font-semibold text-foreground">Help & Support</Text>
            <Text className="text-sm text-muted mt-1">Get help or report an issue</Text>
          </Pressable>

          <Pressable className="bg-surface rounded-lg p-4 border border-border active:opacity-70">
            <Text className="text-base font-semibold text-foreground">Privacy Policy</Text>
            <Text className="text-sm text-muted mt-1">Learn how we protect your data</Text>
          </Pressable>

          <Pressable className="bg-surface rounded-lg p-4 border border-border active:opacity-70">
            <Text className="text-base font-semibold text-foreground">Terms of Service</Text>
            <Text className="text-sm text-muted mt-1">Read our terms and conditions</Text>
          </Pressable>

          <View className="bg-surface rounded-lg p-4 border border-border">
            <Text className="text-sm text-muted">App Version</Text>
            <Text className="text-base font-semibold text-foreground mt-1">1.0.0</Text>
          </View>
        </View>

        {/* Sign out / Sign in */}
        <View className="px-6 py-6">
          {user ? (
            <Pressable
              onPress={handleLogout}
              className="bg-error/10 rounded-lg py-3 items-center active:opacity-70"
            >
              <Text className="text-error font-semibold">Sign Out</Text>
            </Pressable>
          ) : (
            <Pressable className="bg-primary rounded-lg py-3 items-center active:opacity-70">
              <Text className="text-background font-semibold">Sign In</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
