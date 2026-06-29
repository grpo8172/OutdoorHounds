import { ScrollView, Text, View, Pressable, Switch } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useState } from "react";

export default function SettingsScreen() {
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [maxDistance, setMaxDistance] = useState("25");

  return (
    <ScreenContainer className="p-0">
      <ScrollView className="flex-1">
        {/* Header */}
        <View className="px-6 py-6 gap-1 bg-background">
          <Text className="text-3xl font-bold text-foreground">Settings</Text>
          <Text className="text-sm text-muted">Customize your experience</Text>
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
              <Text className="text-sm text-muted mt-1">
                Easy on the eyes
              </Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: "#767577", true: "#81c784" }}
            />
          </View>

          {/* Distance Filter */}
          <View className="bg-surface rounded-lg p-4 border border-border">
            <Text className="text-base font-semibold text-foreground mb-3">
              Search Radius
            </Text>
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
                      maxDistance === distance
                        ? "text-background"
                        : "text-foreground"
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

        {/* Logout Button */}
        <View className="px-6 py-6">
          <Pressable className="bg-error/10 rounded-lg py-3 items-center active:opacity-70">
            <Text className="text-error font-semibold">Sign Out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
