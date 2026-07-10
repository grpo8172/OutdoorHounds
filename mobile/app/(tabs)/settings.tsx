import { ScrollView, Text, View, Pressable, Switch, ActivityIndicator } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "@/lib/location-context";
import { trpc } from "@/lib/trpc";
import { router } from "expo-router";
import { useState } from "react";
import { startOAuthLogin } from "@/constants/oauth";
import { UNLOCK_PRICE_LABEL } from "@shared/const";
import { showAlert } from "@/lib/alert";

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
  const { user, logout, devLogin } = useAuth();
  const { lat, lng, placeName, radiusKm, enabled: locationEnabled, loading: locationLoading, error: locationError, requestLocation, setRadius, disable: disableLocation } = useLocation();
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

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

  async function handleDevLogin() {
    try {
      await devLogin();
    } catch (err) {
      showAlert(
        "Dev login failed",
        err instanceof Error ? err.message : "Please try again.",
      );
    }
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
                      {PROFILE_TYPE_LABELS[profile.profileType] ??
                        profile.profileType}
                    </Text>
                  )}
                  {profile?.location && (
                    <Text className="text-xs text-muted">
                      {profile.location}
                    </Text>
                  )}
                </View>
                <Text className="text-xs text-primary font-semibold">Edit</Text>
              </View>
            </Pressable>
          </View>
        )}

        {/* Unlock */}
        {user && (
          <View className="px-6 pb-4">
            <Pressable
              onPress={() => router.push("/subscribe")}
              className="bg-primary/10 rounded-lg p-4 border border-primary gap-1 active:opacity-70"
            >
              <Text className="text-base font-bold text-primary">
                Unlock Outdoor Hounds
              </Text>
              <Text className="text-sm text-muted">
                One-time {UNLOCK_PRICE_LABEL} payment via PayPal unlocks unlimited listings
              </Text>
            </Pressable>
          </View>
        )}

        {/* Create a Listing */}
        <View className="px-6 pb-4">
          <Pressable
            onPress={() => router.push("/create-listing")}
            className="bg-surface rounded-lg p-4 border border-border flex-row items-center justify-between active:opacity-70"
          >
            <View className="flex-1 gap-1">
              <Text className="text-base font-bold text-foreground">Add a Listing</Text>
              <Text className="text-sm text-muted">
                Post a pet, service, event, or stall to the feed
              </Text>
            </View>
            <Text className="text-lg ml-3">＋</Text>
          </Pressable>
        </View>

        {/* Preferences Section */}
        <View className="px-6 py-4 gap-4">
          {/* Notifications */}
          <View className="bg-surface rounded-lg p-4 border border-border flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-base font-semibold text-foreground">
                Notifications
              </Text>
              <Text className="text-sm text-muted mt-1">
                Get alerts for new matches
              </Text>
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
              <Text className="text-base font-semibold text-foreground">
                Dark Mode
              </Text>
              <Text className="text-sm text-muted mt-1">Easy on the eyes</Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: "#767577", true: "#81c784" }}
            />
          </View>

          {/* Location & Search Radius */}
          <View className="bg-surface rounded-lg p-4 border border-border" style={{ gap: 12 }}>
            <Text className="text-base font-semibold text-foreground">Search Radius</Text>

            {/* Toggle */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flex: 1 }}>
                <Text className="text-sm text-foreground" style={{ fontWeight: "500" }}>
                  {locationEnabled ? `📍 ${placeName ?? "Your location"}` : "Use my location"}
                </Text>
                {locationEnabled && (
                  <Text className="text-xs text-muted" style={{ marginTop: 2 }}>
                    Showing listings within {radiusKm}km
                  </Text>
                )}
                {locationError && (
                  <Text style={{ fontSize: 12, color: "#dc2626", marginTop: 2 }}>{locationError}</Text>
                )}
              </View>
              {locationLoading ? (
                <ActivityIndicator size="small" color="#e8843c" />
              ) : (
                <Switch
                  value={locationEnabled}
                  onValueChange={v => v ? requestLocation() : disableLocation()}
                  trackColor={{ false: "#767577", true: "#e8843c" }}
                />
              )}
            </View>

            {/* Radius buttons — only active when location is on */}
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", opacity: locationEnabled ? 1 : 0.4 }}>
              {[5, 10, 25, 50].map((km) => (
                <Pressable
                  key={km}
                  onPress={() => locationEnabled && setRadius(km)}
                  style={{
                    borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8,
                    backgroundColor: radiusKm === km && locationEnabled ? "#e8843c" : "transparent",
                    borderWidth: 1,
                    borderColor: radiusKm === km && locationEnabled ? "#e8843c" : "#e5e7eb",
                  }}
                >
                  <Text style={{ fontWeight: "600", color: radiusKm === km && locationEnabled ? "#fff" : "#374151" }}>
                    {km}km
                  </Text>
                </Pressable>
              ))}
            </View>

            {!locationEnabled && (
              <Text className="text-xs text-muted">Enable location to filter listings by distance.</Text>
            )}
          </View>
        </View>

        {/* About Section */}
        <View className="px-6 py-4 gap-4 mt-4">
          <Text className="text-sm font-semibold text-muted uppercase">
            About
          </Text>

          <Pressable className="bg-surface rounded-lg p-4 border border-border active:opacity-70">
            <Text className="text-base font-semibold text-foreground">
              Help & Support
            </Text>
            <Text className="text-sm text-muted mt-1">
              Get help or report an issue
            </Text>
          </Pressable>

          <Pressable className="bg-surface rounded-lg p-4 border border-border active:opacity-70">
            <Text className="text-base font-semibold text-foreground">
              Privacy Policy
            </Text>
            <Text className="text-sm text-muted mt-1">
              Learn how we protect your data
            </Text>
          </Pressable>

          <Pressable className="bg-surface rounded-lg p-4 border border-border active:opacity-70">
            <Text className="text-base font-semibold text-foreground">
              Terms of Service
            </Text>
            <Text className="text-sm text-muted mt-1">
              Read our terms and conditions
            </Text>
          </Pressable>

          <View className="bg-surface rounded-lg p-4 border border-border">
            <Text className="text-sm text-muted">App Version</Text>
            <Text className="text-base font-semibold text-foreground mt-1">
              1.0.0
            </Text>
          </View>
        </View>

        {/* Sign out / Sign in */}
        <View className="px-6 py-6 gap-3">
          {user ? (
            <Pressable
              onPress={handleLogout}
              className="bg-error/10 rounded-lg py-3 items-center active:opacity-70"
            >
              <Text className="text-error font-semibold">Sign Out</Text>
            </Pressable>
          ) : (
            <>
              <Pressable
                onPress={() => startOAuthLogin()}
                style={{
                  backgroundColor: '#e8843c',
                  borderRadius: 8,
                  paddingVertical: 14,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#ffffff', fontWeight: '600', fontSize: 16 }}>
                  Sign in with Google
                </Text>
              </Pressable>
              {(__DEV__ || process.env.EXPO_PUBLIC_DEV_LOGIN_ENABLED === 'true') && (
                <Pressable
                  onPress={handleDevLogin}
                  style={{
                    borderRadius: 8,
                    paddingVertical: 12,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: '#7a6a58',
                  }}
                >
                  <Text style={{ color: '#7a6a58', fontWeight: '500', fontSize: 14 }}>
                    Continue as test user (dev only)
                  </Text>
                </Pressable>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
