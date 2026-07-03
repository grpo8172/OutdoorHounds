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
import { useState } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { startOAuthLogin } from "@/constants/oauth";
import { trpc } from "@/lib/trpc";
import { AppMode } from "@/lib/mockData";
import { MODES, MODE_FIELDS } from "@/lib/modes";
import { UNLOCK_PRICE_LABEL } from "@shared/const";
import { showAlert } from "@/lib/alert";

const EMPTY_FORM = {
  mode: "" as AppMode | "",
  name: "",
  description: "",
  price: "",
  imageUrl: "",
  videoUrl: "",
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
}: {
  title: string;
  description: string;
  ctaLabel: string;
  onPress: () => void;
  devOnPress?: () => void;
  devError?: string | null;
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
              Continue as test user (dev only)
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
  const { isAuthenticated, loading: authLoading, devLogin } = useAuth();
  const [devLoginError, setDevLoginError] = useState<string | null>(null);

  const handleDevLogin = async () => {
    setDevLoginError(null);
    try {
      await devLogin();
    } catch (err) {
      setDevLoginError(err instanceof Error ? err.message : "Dev login failed. Please try again.");
    }
  };

  const profileQuery = trpc.profiles.getMyProfile.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const hasProfile = !!profileQuery.data?.displayName;

  const subscriptionQuery = trpc.subscriptions.getStatus.useQuery(undefined, {
    enabled: isAuthenticated && hasProfile,
  });
  // In dev mode, bypass the subscription requirement so testers can exercise the full form
  const isUnlocked = isDevLoginEnabled || (subscriptionQuery.data?.active ?? false);

  if (authLoading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <ActivityIndicator />
      </ScreenContainer>
    );
  }

  if (!isAuthenticated) {
    return (
      <GateScreen
        title="Sign in to create a listing"
        description="You can browse and swipe without an account, but creating a listing needs you to be signed in."
        ctaLabel="Sign in with Google"
        onPress={() => startOAuthLogin()}
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

  if (!isDevLoginEnabled && subscriptionQuery.isLoading) {
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
        description={`A one-time ${UNLOCK_PRICE_LABEL} payment unlocks unlimited listings — no subscription, no renewals.`}
        ctaLabel={`Unlock for ${UNLOCK_PRICE_LABEL}`}
        onPress={() => router.push("/subscribe")}
      />
    );
  }

  return <ListingForm />;
}

function ListingForm() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitted, setSubmitted] = useState(false);

  const set = (key: keyof typeof EMPTY_FORM) => (v: string) =>
    setForm((f) => ({ ...f, [key]: v }));

  const submitMutation = trpc.items.submit.useMutation({
    onSuccess: () => setSubmitted(true),
    onError: (err) => showAlert("Submission failed", err.message || "Please try again."),
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
      imageUrl: form.imageUrl.trim() || undefined,
      videoUrl: form.videoUrl.trim() || undefined,
      location: form.location.trim() || undefined,
      breed: form.breed.trim() || undefined,
      age: modeFields?.showAge && !isNaN(ageNum) ? ageNum : undefined,
      contact: form.contact.trim() || undefined,
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
            {selectedMode ? MODES.find((m) => m.id === selectedMode)?.title : ""} feed.
          </Text>
          <Pressable
            onPress={() => { setForm(EMPTY_FORM); setSubmitted(false); }}
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
              {MODES.map((mode) => {
                const selected = form.mode === mode.id;
                return (
                  <Pressable
                    key={mode.id}
                    onPress={() => setForm((f) => ({ ...f, mode: mode.id }))}
                    className="rounded-full px-4 py-2 border active:opacity-70"
                    style={{
                      backgroundColor: selected ? "#e8843c" : "#ffffff",
                      borderColor: selected ? "#e8843c" : "#ddd5c4",
                    }}
                  >
                    <Text
                      className="text-sm font-medium"
                      style={{ color: selected ? "#a8d4b8" : "#2c2c2c" }}
                    >
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

          {/* Photo URL */}
          <Field label="Photo URL (optional)">
            <Input
              value={form.imageUrl}
              onChangeText={set("imageUrl")}
              placeholder="https://..."
              keyboardType="url"
            />
          </Field>

          {/* Video URL */}
          <Field label="Video URL (optional)">
            <Input
              value={form.videoUrl}
              onChangeText={set("videoUrl")}
              placeholder="YouTube, Vimeo, or direct link"
              keyboardType="url"
            />
          </Field>

          {/* Submit */}
          <Pressable
            onPress={handleSubmit}
            disabled={!isValid || submitMutation.isPending}
            className="rounded-xl py-4 items-center active:opacity-80 mt-2"
            style={{
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
