import { ScrollView, Text, View, Pressable, TextInput } from "react-native";
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
  const [formError, setFormError] = useState<string | null>(null);

  const updateProfile = trpc.profiles.updateMyProfile.useMutation({
    onSuccess: () => router.replace("/"),
    onError: (err) => setFormError(err.message),
  });

  function toggleMode(mode: BrowsingModeValue) {
    setSelectedModes((prev) =>
      prev.includes(mode) ? prev.filter((m) => m !== mode) : [...prev, mode],
    );
  }

  function handleSubmit() {
    setFormError(null);
    if (!displayName.trim()) {
      setFormError("Please enter a display name before continuing.");
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
              {PROFILE_TYPES.map((pt) => {
                const selected = profileType === pt.value;
                return (
                  <Pressable
                    key={pt.value}
                    onPress={() => setProfileType(pt.value)}
                    style={{
                      borderRadius: 8,
                      paddingHorizontal: 16,
                      paddingVertical: 13,
                      borderWidth: 2,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: selected ? '#e8843c' : undefined,
                      borderColor: selected ? '#e8843c' : '#9BA1A6',
                      opacity: 1,
                    }}
                    className="bg-surface active:opacity-70"
                  >
                    <Text style={{ fontWeight: '500', fontSize: 15, color: selected ? '#ffffff' : undefined }} className="text-foreground">
                      {pt.label}
                    </Text>
                    {/* Radio indicator */}
                    <View style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      borderWidth: 2,
                      borderColor: selected ? 'rgba(255,255,255,0.8)' : '#9BA1A6',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {selected && (
                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#ffffff' }} />
                      )}
                    </View>
                  </Pressable>
                );
              })}
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
                    style={{
                      borderRadius: 8,
                      paddingHorizontal: 16,
                      paddingVertical: 13,
                      borderWidth: 2,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      borderColor: active ? '#e8843c' : '#9BA1A6',
                    }}
                    className={`${active ? 'bg-primary/10' : 'bg-surface'} active:opacity-70`}
                  >
                    {/* Checkbox */}
                    <View style={{
                      width: 22,
                      height: 22,
                      borderRadius: 4,
                      borderWidth: 2,
                      borderColor: active ? '#e8843c' : '#9BA1A6',
                      backgroundColor: active ? '#e8843c' : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {active && <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '700', lineHeight: 14 }}>✓</Text>}
                    </View>
                    <Text style={{ fontWeight: '500', fontSize: 15, flex: 1 }} className={active ? 'text-primary' : 'text-foreground'}>
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

          {/* Inline error */}
          {formError && (
            <View style={{ backgroundColor: '#fee2e2', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#fca5a5' }}>
              <Text style={{ color: '#b91c1c', fontSize: 14 }}>{formError}</Text>
            </View>
          )}

          {/* Submit */}
          <Pressable
            onPress={handleSubmit}
            disabled={updateProfile.isPending}
            style={{ backgroundColor: '#e8843c', borderRadius: 8, paddingVertical: 16, alignItems: 'center', marginTop: 8 }}
            className="active:opacity-80"
          >
            <Text style={{ color: '#ffffff', fontWeight: '600', fontSize: 16 }}>
              {updateProfile.isPending ? "Saving…" : "Get started"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
