import {
  Text,
  View,
  Pressable,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { ImagePickerField } from "@/components/image-picker-field";
import { useAuth } from "@/hooks/use-auth";
import { useActiveTenant } from "@/hooks/use-active-tenant";
import { startOAuthLogin } from "@/constants/oauth";
import { trpc } from "@/lib/trpc";
import { AppMode } from "@/lib/mockData";
import { MODE_FIELDS } from "@/lib/modes";
import { mergeTenantModes } from "@/lib/tenant-modes";
import { UNLOCK_PRICE_LABEL } from "@shared/const";
import { showAlert } from "@/lib/alert";
import { isPaywallError, isGuestLimitError, isDailyCapError } from "@/lib/trpc-error";

const EMPTY_FORM = {
  mode: "" as AppMode | "",
  name: "",
  description: "",
  tileDescription: "",
  price: "",
  location: "",
  breed: "",
  age: "",
  contact: "",
};

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View className="mb-5">
      <Text className="text-sm font-semibold text-foreground mb-2">
        {label}
        {required && " *"}
      </Text>
      {children}
    </View>
  );
}

function Input({
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: "default" | "url" | "numeric" | "email-address" | "phone-pad";
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#9BA1A6"
      multiline={multiline}
      numberOfLines={multiline ? 4 : 1}
      keyboardType={keyboardType ?? "default"}
      autoCapitalize={keyboardType === "url" ? "none" : "sentences"}
      className="bg-surface border border-border rounded-xl px-4 py-3 text-foreground"
      style={multiline ? { minHeight: 100, textAlignVertical: "top" } : undefined}
    />
  );
}

const isDevLoginEnabled = __DEV__ || process.env.EXPO_PUBLIC_DEV_LOGIN_ENABLED === 'true';

function GateScreen({
  title,
  description,
  ctaLabel,
  onPress,
  devOnPress,
  devError,
  guestOnPress,
}: {
  title: string;
  description: string;
  ctaLabel: string;
  onPress: () => void;
  devOnPress?: () => void;
  devError?: string | null;
  guestOnPress?: () => void;
}) {
  return (
    <ScreenContainer className="p-6 items-center justify-center">
      <View style={{ alignItems: 'center', gap: 16, maxWidth: 320, width: '100%' }}>
        <Text style={{ fontSize: 48 }}>🔒</Text>
        <Text className="text-2xl font-bold text-foreground text-center">{title}</Text>
        <Text className="text-base text-muted text-center">{description}</Text>
        <Pressable
          onPress={onPress}
          style={{
            backgroundColor: '#e8843c',
            borderRadius: 12,
            paddingVertical: 14,
            paddingHorizontal: 24,
            alignItems: 'center',
            width: '100%',
            marginTop: 8,
          }}
        >
          <Text style={{ color: '#ffffff', fontWeight: '600', fontSize: 16 }}>
            {ctaLabel}
          </Text>
        </Pressable>
        {guestOnPress && (
          <Pressable
            onPress={guestOnPress}
            style={{
              borderRadius: 12,
              paddingVertical: 12,
              paddingHorizontal: 24,
              alignItems: 'center',
              width: '100%',
              borderWidth: 1,
              borderColor: '#7a6a58',
            }}
          >
            <Text style={{ color: '#7a6a58', fontWeight: '500', fontSize: 14 }}>
              Continue as Guest
            </Text>
          </Pressable>
        )}
        {isDevLoginEnabled && devOnPress && (
          <Pressable
            onPress={devOnPress}
            style={{
              borderRadius: 12,
              paddingVertical: 12,
              paddingHorizontal: 24,
              alignItems: 'center',
              width: '100%',
              borderWidth: 1,
              borderColor: '#7a6a58',
            }}
          >
            <Text style={{ color: '#7a6a58', fontWeight: '500', fontSize: 14 }}>
              Try it out
            </Text>
          </Pressable>
        )}
        {devError && (
          <View style={{ backgroundColor: '#fee2e2', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#fca5a5', width: '100%' }}>
            <Text style={{ color: '#b91c1c', fontSize: 14 }}>{devError}</Text>
          </View>
        )}
      </View>
    </ScreenContainer>
  );
}

export default function CreateListingScreen() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading, devLogin, guestLogin } = useAuth();
  const [devLoginError, setDevLoginError] = useState<string | null>(null);

  const handleDevLogin = async () => {
    setDevLoginError(null);
    try {
      await devLogin();
    } catch (err) {
      setDevLoginError(err instanceof Error ? err.message : "Dev login failed. Please try again.");
    }
  };

  const handleGuestLogin = async () => {
    setDevLoginError(null);
    try {
      await guestLogin();
    } catch (err) {
      setDevLoginError(err instanceof Error ? err.message : "Couldn't continue as guest. Please try again.");
    }
  };

  const profileQuery = trpc.profiles.getMyProfile.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const hasProfile = !!profileQuery.data?.displayName;

  const { modeConfig: tenantModeConfig, allowPublicListings, freeListings } = useActiveTenant();
  const modes = useMemo(() => mergeTenantModes(tenantModeConfig), [tenantModeConfig]);

  const subscriptionQuery = trpc.subscriptions.getStatus.useQuery(undefined, {
    enabled: isAuthenticated && hasProfile,
  });
  const isGuest = user?.loginMethod === "guest";
  // A free-listings tenant (e.g. a shelter's community link) waives the
  // paid-unlock gate here for UX — the server independently re-checks this
  // per-submission and is still mode-specific (adopt/foster only), see
  // items.ts's submit mutation.
  const isUnlocked =
    user?.loginMethod === "dev" || isGuest || freeListings || (subscriptionQuery.data?.active ?? false);

  if (authLoading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <ActivityIndicator />
      </ScreenContainer>
    );
  }

  if (!allowPublicListings) {
    return (
      <GateScreen
        title="Not accepting submissions"
        description="This business only shows listings added by its own owner right now."
        ctaLabel="Go back"
        onPress={() => router.back()}
      />
    );
  }

  if (!isAuthenticated) {
    return (
      <GateScreen
        title="Sign in to create a listing"
        description="You can browse and swipe without an account, but creating a listing needs you to be signed in."
        ctaLabel="Sign in with Google"
        onPress={() => startOAuthLogin()}
        guestOnPress={handleGuestLogin}
        devOnPress={handleDevLogin}
        devError={devLoginError}
      />
    );
  }

  if (profileQuery.isLoading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <ActivityIndicator />
      </ScreenContainer>
    );
  }

  if (!hasProfile) {
    return (
      <GateScreen
        title="Complete your profile"
        description="Set up your profile before creating a listing so people know who they're dealing with."
        ctaLabel="Complete Profile"
        onPress={() => router.push("/onboarding")}
      />
    );
  }

  if (user?.loginMethod !== "dev" && !isGuest && subscriptionQuery.isLoading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <ActivityIndicator />
      </ScreenContainer>
    );
  }

  if (!isUnlocked) {
    return (
      <GateScreen
        title="Unlock Outdoor Hounds"
        description={`A one-time ${UNLOCK_PRICE_LABEL} payment unlocks up to 40 listings a day — no subscription, no renewals.`}
        ctaLabel={`Unlock for ${UNLOCK_PRICE_LABEL}`}
        onPress={() => router.push("/subscribe")}
        devOnPress={handleDevLogin}
        devError={devLoginError}
      />
    );
  }

  return <ListingForm modes={modes} />;
}

function ListingForm({ modes }: { modes: ReturnType<typeof mergeTenantModes> }) {
  const router = useRouter();
  const [form, setForm] = useState(EMPTY_FORM);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoUploading, setVideoUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const set = (key: keyof typeof EMPTY_FORM) => (v: string) =>
    setForm((f) => ({ ...f, [key]: v }));

  const submitMutation = trpc.items.submit.useMutation({
    onSuccess: () => setSubmitted(true),
    onError: (err) => {
      if (isDailyCapError(err)) {
        showAlert("Daily limit reached", `Pay ${UNLOCK_PRICE_LABEL} for 40 more listings today.`);
        router.push("/subscribe");
        return;
      }
      if (isPaywallError(err)) { router.push("/subscribe"); return; }
      if (isGuestLimitError(err)) {
        showAlert("Daily limit reached", "Sign in to keep creating listings.");
        startOAuthLogin();
        return;
      }
      showAlert("Submission failed", err.message || "Please try again.");
    },
  });

  const selectedMode = form.mode as AppMode | "";
  const modeFields = selectedMode ? MODE_FIELDS[selectedMode] : null;
  const missingFields = [
    !selectedMode && "a category",
    !form.name.trim() && "a title",
    !form.description.trim() && "a description",
  ].filter((field): field is string => !!field);
  const isValid = missingFields.length === 0;
  const missingFieldsMessage =
    missingFields.length === 1
      ? missingFields[0]
      : `${missingFields.slice(0, -1).join(", ")} and ${missingFields[missingFields.length - 1]}`;

  const handleSubmit = () => {
    if (!isValid) return;
    const ageNum = parseInt(form.age, 10);
    submitMutation.mutate({
      mode: selectedMode as AppMode,
      name: form.name.trim(),
      description: form.description.trim(),
      price: form.price.trim() || undefined,
      imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
      videoUrl: videoUrl || undefined,
      location: form.location.trim() || undefined,
      breed: form.breed.trim() || undefined,
      age: modeFields?.showAge && !isNaN(ageNum) ? ageNum : undefined,
      contact: form.contact.trim() || undefined,
      tileDescription: form.tileDescription.trim() || undefined,
    });
  };

  if (submitted) {
    return (
      <ScreenContainer className="p-6 items-center justify-center">
        <View className="items-center gap-4">
          <Text style={{ fontSize: 48 }}>🐾</Text>
          <Text className="text-2xl font-bold text-foreground">Listing Live!</Text>
          <Text className="text-base text-muted text-center">
            Your listing is now visible in the{" "}
            {selectedMode ? modes.find((m) => m.id === selectedMode)?.title : ""} feed.
          </Text>
          <Pressable
            onPress={() => { setForm(EMPTY_FORM); setImageUrls([]); setVideoUrl(null); setSubmitted(false); }}
            className="rounded-xl px-6 py-3 mt-2 active:opacity-80"
            style={{ backgroundColor: "#e8843c" }}
          >
            <Text className="font-semibold" style={{ color: "#a8d4b8" }}>Add Another</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View className="flex-row items-center gap-3 mb-6">
            <View className="flex-1">
              <Text className="text-2xl font-bold text-foreground">Add a Listing</Text>
              <Text className="text-xs text-muted">Goes live immediately in the public feed</Text>
            </View>
          </View>

          {/* Category */}
          <Field label="Category" required>
            <Text className="text-xs text-muted mb-2 -mt-1">Tap one to select</Text>
            <View className="flex-row flex-wrap gap-2">
              {modes.map((mode) => {
                const selected = form.mode === mode.id;
                return (
                  <Pressable
                    key={mode.id}
                    onPress={() => setForm((f) => ({ ...f, mode: mode.id }))}
                    style={{
                      borderRadius: 999,
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderWidth: 1.5,
                      backgroundColor: selected ? "#e8843c" : "#ffffff",
                      borderColor: selected ? "#e8843c" : "#ddd5c4",
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: "500", color: selected ? "#ffffff" : "#2c2c2c" }}>
                      {mode.emoji} {mode.title}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Field>

          {/* Title */}
          <Field label="Title" required>
            <Input
              value={form.name}
              onChangeText={set("name")}
              placeholder={
                selectedMode === "adopt_or_foster" ? "e.g. Max — 3yr Golden Retriever"
                : selectedMode === "lost_and_found"  ? "e.g. Lost: Milo the Beagle"
                : selectedMode === "pet_events"      ? "e.g. Bark in the Park — July"
                : selectedMode === "stalls_and_shops"? "e.g. Pawsome Treats Co."
                : "e.g. Professional dog walking service"
              }
            />
          </Field>

          {/* Description */}
          <Field label="Description" required>
            <Input
              value={form.description}
              onChangeText={set("description")}
              placeholder="Tell people about your listing..."
              multiline
            />
          </Field>

          {/* Location — all modes */}
          <Field label="Location">
            <Input
              value={form.location}
              onChangeText={set("location")}
              placeholder="e.g. San Francisco, CA"
            />
          </Field>

          {/* Breed — adopt_or_foster + lost_and_found */}
          {modeFields?.showBreed && (
            <Field label="Breed">
              <Input
                value={form.breed}
                onChangeText={set("breed")}
                placeholder="e.g. Golden Retriever, Mixed breed"
              />
            </Field>
          )}

          {/* Age — adopt_or_foster only */}
          {modeFields?.showAge && (
            <Field label="Age (years)">
              <Input
                value={form.age}
                onChangeText={set("age")}
                placeholder="e.g. 3"
                keyboardType="numeric"
              />
            </Field>
          )}

          {/* Contact — lost_and_found */}
          {modeFields?.showContact && (
            <Field label="Contact details">
              <Input
                value={form.contact}
                onChangeText={set("contact")}
                placeholder="Phone, email, or social handle"
              />
            </Field>
          )}

          {/* Price */}
          <Field label="Price / Cost (optional)">
            <Input
              value={form.price}
              onChangeText={set("price")}
              placeholder="e.g. Free, $25/walk, $10–30"
            />
          </Field>

          {/* Tile description */}
          <Field label="Card tagline (optional)">
            <Input
              value={form.tileDescription}
              onChangeText={set("tileDescription")}
              placeholder="Short line shown on the swipe card, e.g. 'Gentle & great with kids'"
            />
          </Field>

          {/* Photos */}
          <Field label="Photos (optional)">
            <ImagePickerField urls={imageUrls} onChange={setImageUrls} />
          </Field>

          {/* Video clip */}
          <Field label="Short video clip (optional)">
            {videoUrl ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 12, backgroundColor: "#f9fafb", borderRadius: 10, borderWidth: 1, borderColor: "#e5e7eb" }}>
                <Text style={{ flex: 1, fontSize: 13, color: "#374151" }}>🎬 Clip uploaded</Text>
                <Pressable onPress={() => setVideoUrl(null)}>
                  <Text style={{ color: "#dc2626", fontSize: 13, fontWeight: "600" }}>Remove</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = "video/*";
                  input.onchange = async () => {
                    const file = input.files?.[0];
                    if (!file) return;
                    setVideoUploading(true);
                    try {
                      const fd = new FormData();
                      fd.append("files", file);
                      const res = await fetch("/api/upload", { method: "POST", body: fd, credentials: "include" });
                      const data = await res.json();
                      setVideoUrl(data.urls?.[0] ?? null);
                    } catch { /* ignore */ } finally {
                      setVideoUploading(false);
                    }
                  };
                  input.click();
                }}
                disabled={videoUploading}
                style={({ pressed }) => ({
                  borderWidth: 2, borderColor: pressed ? "#e8843c" : "#ddd5c4",
                  borderStyle: "dashed", borderRadius: 12, paddingVertical: 14,
                  alignItems: "center", gap: 4,
                  backgroundColor: pressed ? "#fff7f0" : "transparent",
                })}
              >
                {videoUploading
                  ? <ActivityIndicator color="#e8843c" />
                  : <>
                      <Text style={{ fontSize: 22 }}>🎬</Text>
                      <Text style={{ color: "#e8843c", fontWeight: "600", fontSize: 13 }}>Add a short clip</Text>
                      <Text style={{ color: "#9ca3af", fontSize: 11 }}>Tap to select a video from your device</Text>
                    </>
                }
              </Pressable>
            )}
          </Field>

          {/* Submit */}
          <Pressable
            onPress={handleSubmit}
            disabled={!isValid || submitMutation.isPending}
            style={{
              borderRadius: 16,
              paddingVertical: 16,
              alignItems: "center",
              marginTop: 8,
              backgroundColor: isValid ? "#e8843c" : "rgba(122, 106, 88, 0.3)",
            }}
          >
            {submitMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text
                className="font-semibold text-base"
                style={{ color: isValid ? "#a8d4b8" : "#7a6a58" }}
              >
                Publish Listing
              </Text>
            )}
          </Pressable>

          {!isValid && (
            <Text className="text-center text-xs text-muted mt-3">
              Add {missingFieldsMessage} to publish
            </Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
