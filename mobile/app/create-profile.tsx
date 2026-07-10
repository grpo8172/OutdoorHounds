import { useState } from "react";
import { ScrollView, Text, View, Pressable, TextInput, ActivityIndicator } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { router } from "expo-router";
import { useAuth } from "@/hooks/use-auth";
import { startOAuthLogin } from "@/constants/oauth";
import { trpc } from "@/lib/trpc";
import { showAlert } from "@/lib/alert";

const SEEKING = [
  { value: "adopt_or_foster",           label: "Adopt or Foster",        emoji: "🐾" },
  { value: "pet_services",              label: "Pet Services",           emoji: "🦮" },
  { value: "pet_events",                label: "Events & Hikes",         emoji: "🎉" },
  { value: "stalls_and_shops",          label: "Stalls & Shops",         emoji: "🛍️" },
  { value: "lost_and_found",            label: "Lost & Found",           emoji: "🔍" },
  { value: "mini_petting_zoo_bookings", label: "Mini Petting Zoo",       emoji: "🐑" },
] as const;

type SeekingValue = (typeof SEEKING)[number]["value"];

type Step = "auth" | "bio" | "seeking";

// ── Small card preview ────────────────────────────────────────────────────────

function ProfilePreview({ name, bio, seeking }: { name: string; bio: string; seeking: SeekingValue[] }) {
  const chips = SEEKING.filter(s => seeking.includes(s.value));
  return (
    <View style={{
      backgroundColor: "#fff", borderRadius: 16, padding: 20,
      shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 12, elevation: 4,
      borderWidth: 1, borderColor: "#e5e7eb",
    }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 }}>
        <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: "#e8843c", alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: "#fff", fontSize: 20, fontWeight: "700" }}>
            {name.trim() ? name.trim()[0].toUpperCase() : "?"}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: "700", color: "#111" }}>{name.trim() || "Your name"}</Text>
          <Text style={{ fontSize: 12, color: "#9ca3af" }}>Your profile</Text>
        </View>
      </View>
      {bio.trim() ? (
        <Text style={{ fontSize: 14, color: "#374151", lineHeight: 20, marginBottom: 10 }} numberOfLines={3}>
          {bio.trim()}
        </Text>
      ) : (
        <Text style={{ fontSize: 14, color: "#d1d5db", fontStyle: "italic", marginBottom: 10 }}>
          Your bio will appear here…
        </Text>
      )}
      {chips.length > 0 && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {chips.map(c => (
            <View key={c.value} style={{ backgroundColor: "#fff7f0", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: "#e8843c" }}>
              <Text style={{ fontSize: 12, color: "#e8843c", fontWeight: "600" }}>{c.emoji} {c.label}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function CreateProfileScreen() {
  const { user, loading: authLoading, devLogin } = useAuth();
  const [step, setStep] = useState<Step>("auth");
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [seeking, setSeeking] = useState<SeekingValue[]>([]);

  // Move straight to bio if already logged in
  const effectiveStep = !authLoading && user && step === "auth" ? "bio" : step;

  const updateProfile = trpc.profiles.updateMyProfile.useMutation({
    onSuccess: () => router.replace("/"),
    onError: (err) => showAlert("Couldn't save profile", err.message),
  });

  function toggleSeeking(val: SeekingValue) {
    setSeeking(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);
  }

  async function handleDevLogin() {
    try {
      await devLogin();
      setStep("bio");
    } catch (err) {
      showAlert("Dev login failed", err instanceof Error ? err.message : "Try again");
    }
  }

  function handleSave() {
    if (!name.trim()) {
      showAlert("One more thing", "Please add your name before saving.");
      return;
    }
    updateProfile.mutate({
      displayName: name.trim(),
      bio: bio.trim() || undefined,
      preferredModesJson: seeking as any,
    });
  }

  if (authLoading) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color="#e8843c" />
        </View>
      </ScreenContainer>
    );
  }

  // ── Step: auth ────────────────────────────────────────────────────────────

  if (effectiveStep === "auth") {
    return (
      <ScreenContainer className="p-0">
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 28, gap: 28, paddingBottom: 60 }}>
          <Pressable onPress={() => router.back()} style={{ alignSelf: "flex-start", paddingVertical: 4 }}>
            <Text style={{ color: "#9ca3af", fontSize: 15 }}>← Back</Text>
          </Pressable>

          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 30, fontWeight: "800", color: "#111" }}>Create your profile</Text>
            <Text style={{ fontSize: 15, color: "#6b7280", lineHeight: 22 }}>
              Sign in to build your profile and start connecting with listings, listers, and other pet lovers.
            </Text>
          </View>

          <ProfilePreview name="" bio="" seeking={[]} />

          <View style={{ gap: 12, marginTop: 8 }}>
            <Pressable
              onPress={() => startOAuthLogin()}
              style={{ backgroundColor: "#e8843c", borderRadius: 12, paddingVertical: 16, alignItems: "center" }}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>Continue with Google</Text>
            </Pressable>

            {(__DEV__ || process.env.EXPO_PUBLIC_DEV_LOGIN_ENABLED === "true") && (
              <Pressable
                onPress={handleDevLogin}
                style={{ borderRadius: 12, paddingVertical: 14, alignItems: "center", borderWidth: 1, borderColor: "#d1d5db" }}
              >
                <Text style={{ color: "#6b7280", fontWeight: "500", fontSize: 14 }}>Try it out</Text>
              </Pressable>
            )}
          </View>

          <Text style={{ fontSize: 12, color: "#d1d5db", textAlign: "center" }}>
            Free to join · Your info is only shared with people you message
          </Text>
        </ScrollView>
      </ScreenContainer>
    );
  }

  // ── Step: bio ─────────────────────────────────────────────────────────────

  if (effectiveStep === "bio") {
    return (
      <ScreenContainer className="p-0">
        <ScrollView contentContainerStyle={{ padding: 24, gap: 24, paddingBottom: 60 }}>
          <Pressable onPress={() => router.back()} style={{ alignSelf: "flex-start", paddingVertical: 4 }}>
            <Text style={{ color: "#9ca3af", fontSize: 15 }}>← Back</Text>
          </Pressable>

          {/* Steps indicator */}
          <View style={{ flexDirection: "row", gap: 6 }}>
            <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: "#e8843c" }} />
            <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: "#e5e7eb" }} />
          </View>

          <View style={{ gap: 4 }}>
            <Text style={{ fontSize: 26, fontWeight: "800", color: "#111" }}>About you</Text>
            <Text style={{ fontSize: 14, color: "#6b7280" }}>This is your public profile — listers will see this when you enquire.</Text>
          </View>

          <ProfilePreview name={name} bio={bio} seeking={seeking} />

          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: "#374151", textTransform: "uppercase", letterSpacing: 0.5 }}>Your name *</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="How should people know you?"
              placeholderTextColor="#9ca3af"
              autoCapitalize="words"
              style={{
                backgroundColor: "#f9fafb", borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14,
                fontSize: 16, borderWidth: 1.5, borderColor: name.trim() ? "#e8843c" : "#e5e7eb", color: "#111",
              }}
            />
          </View>

          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: "#374151", textTransform: "uppercase", letterSpacing: 0.5 }}>Your bio</Text>
            <Text style={{ fontSize: 12, color: "#9ca3af", marginBottom: 4 }}>
              Tell listers who you are — your lifestyle, situation, what you're hoping to find.
            </Text>
            <TextInput
              value={bio}
              onChangeText={setBio}
              placeholder={"e.g. We're a young family with a big backyard looking to adopt a gentle dog. We work from home and have two kids aged 6 and 9 who are excited to have a furry companion…"}
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              style={{
                backgroundColor: "#f9fafb", borderRadius: 10, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14,
                fontSize: 15, lineHeight: 22, borderWidth: 1.5, borderColor: bio.trim() ? "#e8843c" : "#e5e7eb",
                color: "#111", minHeight: 130,
              }}
            />
          </View>

          <Pressable
            onPress={() => setStep("seeking")}
            style={{ backgroundColor: "#e8843c", borderRadius: 12, paddingVertical: 16, alignItems: "center" }}
          >
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>Next →</Text>
          </Pressable>
        </ScrollView>
      </ScreenContainer>
    );
  }

  // ── Step: seeking ─────────────────────────────────────────────────────────

  return (
    <ScreenContainer className="p-0">
      <ScrollView contentContainerStyle={{ padding: 24, gap: 20, paddingBottom: 80 }}>
        <Pressable onPress={() => setStep("bio")} style={{ alignSelf: "flex-start", paddingVertical: 4 }}>
          <Text style={{ color: "#9ca3af", fontSize: 15 }}>← Back</Text>
        </Pressable>

        {/* Steps indicator */}
        <View style={{ flexDirection: "row", gap: 6 }}>
          <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: "#e8843c" }} />
          <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: "#e8843c" }} />
        </View>

        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 26, fontWeight: "800", color: "#111" }}>What are you looking for?</Text>
          <Text style={{ fontSize: 14, color: "#6b7280" }}>Select everything that applies — you can change this any time.</Text>
        </View>

        <View style={{ gap: 10 }}>
          {SEEKING.map(s => {
            const active = seeking.includes(s.value);
            return (
              <Pressable
                key={s.value}
                onPress={() => toggleSeeking(s.value)}
                style={{
                  flexDirection: "row", alignItems: "center", gap: 16,
                  borderRadius: 12, paddingHorizontal: 18, paddingVertical: 16,
                  borderWidth: 2,
                  borderColor: active ? "#e8843c" : "#e5e7eb",
                  backgroundColor: active ? "#fff7f0" : "#fff",
                }}
              >
                <Text style={{ fontSize: 26 }}>{s.emoji}</Text>
                <Text style={{ flex: 1, fontSize: 16, fontWeight: "600", color: active ? "#e8843c" : "#374151" }}>
                  {s.label}
                </Text>
                <View style={{
                  width: 24, height: 24, borderRadius: 12, borderWidth: 2,
                  borderColor: active ? "#e8843c" : "#d1d5db",
                  backgroundColor: active ? "#e8843c" : "transparent",
                  alignItems: "center", justifyContent: "center",
                }}>
                  {active && <Text style={{ color: "#fff", fontSize: 13, fontWeight: "800" }}>✓</Text>}
                </View>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={handleSave}
          disabled={updateProfile.isPending}
          style={{
            backgroundColor: "#e8843c", borderRadius: 12, paddingVertical: 18,
            alignItems: "center", marginTop: 8,
            opacity: updateProfile.isPending ? 0.6 : 1,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 17 }}>
            {updateProfile.isPending ? "Saving…" : "Create my profile 🐾"}
          </Text>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}
