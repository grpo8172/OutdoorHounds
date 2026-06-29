import { ScrollView, Text, View, Pressable, TextInput, Alert } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { router } from "expo-router";
import { useState } from "react";

const PROFILE_TYPES = [
  { value: "individual", label: "Individual" },
  { value: "rescue_group", label: "Rescue Group" },
  { value: "foster_carer", label: "Foster Carer" },
  { value: "pet_service_provider", label: "Pet Service Provider" },
  { value: "stall_holder", label: "Stall Holder" },
  { value: "event_organiser", label: "Event Organiser" },
  { value: "petting_zoo_provider", label: "Mini Petting Zoo Provider" },
] as const;

const BROWSING_MODES = [
  { value: "adopt_or_foster", label: "Adopt or Foster" },
  { value: "pet_services", label: "Pet Services" },
  { value: "pet_events", label: "Pet Events" },
  { value: "stalls_and_shops", label: "Stalls & Shops" },
  { value: "lost_and_found", label: "Lost & Found" },
  { value: "mini_petting_zoo_bookings", label: "Mini Petting Zoo Bookings" },
] as const;

type ProfileTypeValue = (typeof PROFILE_TYPES)[number]["value"];
type BrowsingModeValue = (typeof BROWSING_MODES)[number]["value"];

export default function OnboardingScreen() {
  const [displayName, setDisplayName] = useState("");
  const [profileType, setProfileType] = useState<ProfileTypeValue>("individual");
  const [selectedModes, setSelectedModes] = useState<BrowsingModeValue[]>([]);
  const [location, setLocation] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  const updateProfile = trpc.profiles.updateMyProfile.useMutation({
    onSuccess: () => router.replace("/(tabs)"),
    onError: (err) => Alert.alert("Error", err.message),
  });

  function toggleMode(mode: BrowsingModeValue) {
    setSelectedModes((prev) =>
      prev.includes(mode) ? prev.filter((m) => m !== mode) : [...prev, mode],
    );
  }

  function handleSubmit() {
    if (!displayName.trim()) {
      Alert.alert("Display name required", "Please enter a name so others can recognise you.");
      return;
    }
    updateProfile.mutate({
      displayName: displayName.trim(),
      profileType,
      preferredModesJson: selectedModes,
      location: location.trim() || undefined,
      contactEmail: contactEmail.trim() || undefined,
      contactPhone: contactPhone.trim() || undefined,
    });
  }

  return (
    <ScreenContainer className="p-0">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View className="px-6 pt-10 pb-6 bg-background gap-2">
          <Text className="text-3xl font-bold text-foreground">Welcome to Outdoor Hounds</Text>
          <Text className="text-sm text-muted">
            Tell us a little about yourself to get started.
          </Text>
        </View>

        <View className="px-6 gap-6">
          {/* Display name */}
          <View className="gap-2">
            <Text className="text-sm font-semibold text-foreground">Display name *</Text>
            <TextInput
              className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
              placeholder="Your name or organisation name"
              placeholderTextColor="#687076"
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
            />
          </View>

          {/* Profile type */}
          <View className="gap-2">
            <Text className="text-sm font-semibold text-foreground">I am a…</Text>
            <View className="gap-2">
              {PROFILE_TYPES.map((pt) => (
                <Pressable
                  key={pt.value}
                  onPress={() => setProfileType(pt.value)}
                  className={`rounded-lg px-4 py-3 border ${
                    profileType === pt.value
                      ? "bg-primary border-primary"
                      : "bg-surface border-border"
                  } active:opacity-70`}
                >
                  <Text
                    className={`font-medium ${
                      profileType === pt.value ? "text-background" : "text-foreground"
                    }`}
                  >
                    {pt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Browsing modes */}
          <View className="gap-2">
            <Text className="text-sm font-semibold text-foreground">
              What are you interested in? (select all that apply)
            </Text>
            <View className="gap-2">
              {BROWSING_MODES.map((mode) => {
                const active = selectedModes.includes(mode.value);
                return (
                  <Pressable
                    key={mode.value}
                    onPress={() => toggleMode(mode.value)}
                    className={`rounded-lg px-4 py-3 border flex-row items-center gap-3 ${
                      active ? "bg-primary/10 border-primary" : "bg-surface border-border"
                    } active:opacity-70`}
                  >
                    <View
                      className={`w-5 h-5 rounded border-2 items-center justify-center ${
                        active ? "bg-primary border-primary" : "border-border"
                      }`}
                    >
                      {active && <Text className="text-background text-xs font-bold">✓</Text>}
                    </View>
                    <Text
                      className={`font-medium ${active ? "text-primary" : "text-foreground"}`}
                    >
                      {mode.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Location */}
          <View className="gap-2">
            <Text className="text-sm font-semibold text-foreground">Location (optional)</Text>
            <TextInput
              className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
              placeholder="e.g. Melbourne, VIC"
              placeholderTextColor="#687076"
              value={location}
              onChangeText={setLocation}
            />
          </View>

          {/* Contact email */}
          <View className="gap-2">
            <Text className="text-sm font-semibold text-foreground">Contact email (optional)</Text>
            <TextInput
              className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
              placeholder="you@example.com"
              placeholderTextColor="#687076"
              value={contactEmail}
              onChangeText={setContactEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Contact phone */}
          <View className="gap-2">
            <Text className="text-sm font-semibold text-foreground">Contact phone (optional)</Text>
            <TextInput
              className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
              placeholder="04xx xxx xxx"
              placeholderTextColor="#687076"
              value={contactPhone}
              onChangeText={setContactPhone}
              keyboardType="phone-pad"
            />
          </View>

          {/* Submit */}
          <Pressable
            onPress={handleSubmit}
            disabled={updateProfile.isPending}
            className="bg-primary rounded-lg py-4 items-center mt-2 active:opacity-80"
          >
            <Text className="text-background font-semibold text-base">
              {updateProfile.isPending ? "Saving…" : "Get started"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
