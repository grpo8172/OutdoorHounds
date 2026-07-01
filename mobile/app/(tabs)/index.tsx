import {
  Image,
  ScrollView,
  Text,
  View,
  Pressable,
  RefreshControl,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { ProfileCard } from "@/components/profile-card";
import { useSwipeProfiles } from "@/hooks/use-swipe-profiles";
import { AppMode } from "@/lib/mockData";
import { useState } from "react";
import { trpc } from "@/lib/trpc";

const MODES = [
  {
    id: "adopt_or_foster" as AppMode,
    title: "Adopt & Foster",
    subtitle: "Give a pet a loving home",
    emoji: "🐾",
    image: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&h=300&fit=crop",
  },
  {
    id: "pet_services" as AppMode,
    title: "Pet Services",
    subtitle: "Trusted care near you",
    emoji: "🏡",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&h=300&fit=crop",
  },
  {
    id: "pet_events" as AppMode,
    title: "Pet Events",
    subtitle: "Join the community",
    emoji: "🎉",
    image: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=600&h=300&fit=crop",
  },
  {
    id: "stalls_and_shops" as AppMode,
    title: "Stalls & Shops",
    subtitle: "Discover pet products",
    emoji: "🛍️",
    image: "https://images.unsplash.com/photo-1601758124510-52d02ddb7cbd?w=600&h=300&fit=crop",
  },
  {
    id: "lost_and_found" as AppMode,
    title: "Lost & Found",
    subtitle: "Help reunite pets",
    emoji: "🔍",
    image: "https://images.unsplash.com/photo-1601758125946-6ec2ef64daf8?w=600&h=300&fit=crop",
  },
] as const;

// Fields shown per mode in the create form
const MODE_FIELDS: Record<AppMode, { showBreed: boolean; showAge: boolean; showContact: boolean }> = {
  adopt_or_foster:  { showBreed: true,  showAge: true,  showContact: false },
  pet_services:     { showBreed: false, showAge: false, showContact: false },
  pet_events:       { showBreed: false, showAge: false, showContact: false },
  stalls_and_shops: { showBreed: false, showAge: false, showContact: false },
  lost_and_found:   { showBreed: true,  showAge: false, showContact: true  },
};

type ViewState = "home" | AppMode | "create";

// ---------------------------------------------------------------------------
// ModeSelector
// ---------------------------------------------------------------------------
function ModeSelector({
  onSelect,
  onCreatePost,
}: {
  onSelect: (mode: AppMode) => void;
  onCreatePost: () => void;
}) {
  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 32, gap: 12 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ gap: 2, paddingTop: 4, marginBottom: 4 }}>
          <Text className="text-3xl font-bold text-foreground">Outdoor Hounds</Text>
          <Text className="text-sm text-muted">What are you looking for today?</Text>
        </View>

        {MODES.map((mode) => (
          <Pressable
            key={mode.id}
            onPress={() => onSelect(mode.id)}
            className="w-full rounded-2xl overflow-hidden border border-border active:opacity-80"
            style={{ height: 110 }}
          >
            <Image
              source={{ uri: mode.image }}
              className="absolute inset-0 w-full h-full"
              resizeMode="cover"
            />
            <View className="absolute inset-0 bg-black/55" />
            <View className="flex-1 flex-row items-center px-5 gap-4">
              <Text style={{ fontSize: 32 }}>{mode.emoji}</Text>
              <View className="flex-1">
                <Text className="text-lg font-bold text-white">{mode.title}</Text>
                <Text className="text-xs text-white/75">{mode.subtitle}</Text>
              </View>
              <View className="bg-white/20 rounded-full px-3 py-1.5 border border-white/30">
                <Text className="text-white text-xs font-semibold">Browse →</Text>
              </View>
            </View>
          </Pressable>
        ))}

        <Pressable
          onPress={onCreatePost}
          className="w-full rounded-2xl border-2 border-dashed border-border bg-surface active:opacity-70"
          style={{ height: 80 }}
        >
          <View className="flex-1 flex-row items-center px-5 gap-4">
            <View className="w-10 h-10 rounded-full bg-primary/15 items-center justify-center">
              <Text className="text-primary text-xl font-bold">+</Text>
            </View>
            <View>
              <Text className="text-foreground font-semibold">Add a Listing</Text>
              <Text className="text-xs text-muted">Share a pet, service, event or product</Text>
            </View>
          </View>
        </Pressable>

        <Text className="text-center text-xs text-muted" style={{ marginTop: 4 }}>
          Tap a card to start browsing
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
}

// ---------------------------------------------------------------------------
// CreatePostScreen
// ---------------------------------------------------------------------------
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

function CreatePostScreen({ onBack }: { onBack: () => void }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitted, setSubmitted] = useState(false);

  const set = (key: keyof typeof EMPTY_FORM) => (v: string) =>
    setForm((f) => ({ ...f, [key]: v }));

  const submitMutation = trpc.items.submit.useMutation({
    onSuccess: () => setSubmitted(true),
    onError: (err) => Alert.alert("Submission failed", err.message || "Please try again."),
  });

  const selectedMode = form.mode as AppMode | "";
  const modeFields = selectedMode ? MODE_FIELDS[selectedMode] : null;
  const isValid = !!selectedMode && form.name.trim() && form.description.trim();

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
            className="bg-primary rounded-xl px-6 py-3 mt-2 active:opacity-80"
          >
            <Text className="text-background font-semibold">Add Another</Text>
          </Pressable>
          <Pressable onPress={onBack} className="active:opacity-70">
            <Text className="text-muted text-sm">← Back to home</Text>
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
            <Pressable onPress={onBack} className="active:opacity-70">
              <Text className="text-primary text-base">← Back</Text>
            </Pressable>
            <View className="flex-1">
              <Text className="text-2xl font-bold text-foreground">Add a Listing</Text>
              <Text className="text-xs text-muted">Goes live immediately in the public feed</Text>
            </View>
          </View>

          {/* Category */}
          <Field label="Category" required>
            <View className="flex-row flex-wrap gap-2">
              {MODES.map((mode) => {
                const selected = form.mode === mode.id;
                return (
                  <Pressable
                    key={mode.id}
                    onPress={() => setForm((f) => ({ ...f, mode: mode.id }))}
                    className={`rounded-full px-4 py-2 border active:opacity-70 ${
                      selected ? "bg-primary border-primary" : "bg-surface border-border"
                    }`}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        selected ? "text-background" : "text-foreground"
                      }`}
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
            className={`rounded-xl py-4 items-center active:opacity-80 mt-2 ${
              isValid ? "bg-primary" : "bg-muted/30"
            }`}
          >
            {submitMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text
                className={`font-semibold text-base ${
                  isValid ? "text-background" : "text-muted"
                }`}
              >
                Publish Listing
              </Text>
            )}
          </Pressable>

          {!isValid && (
            <Text className="text-center text-xs text-muted mt-3">
              Fill in category, title, and description to publish
            </Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

// ---------------------------------------------------------------------------
// DiscoverScreen
// ---------------------------------------------------------------------------
function DiscoverScreen({ mode, onBack }: { mode: AppMode; onBack: () => void }) {
  const modeConfig = MODES.find((m) => m.id === mode)!;

  const {
    currentProfile,
    currentIndex,
    totalProfiles,
    savedListings,
    swipeRight,
    swipeLeft,
    reset,
    isLoading,
  } = useSwipeProfiles(mode);

  const [refreshing, setRefreshing] = useState(false);

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
        <Pressable onPress={onBack} className="mt-4 active:opacity-70">
          <Text className="text-xs text-muted">← Back</Text>
        </Pressable>
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
            className="bg-primary rounded-lg px-6 py-3 mt-2 active:opacity-80"
          >
            <Text className="text-background font-semibold">Start Over</Text>
          </Pressable>
          <Pressable onPress={onBack} className="active:opacity-70 mt-1">
            <Text className="text-muted text-sm">← Switch mode</Text>
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
            <Pressable
              onPress={onBack}
              className="bg-surface border border-border rounded-full px-3 py-1.5 active:opacity-70"
            >
              <Text className="text-xs text-muted font-medium">Switch</Text>
            </Pressable>
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
              <Text className="text-2xl font-bold text-primary">{savedListings.length}</Text>
              <Text className="text-xs text-muted">Saved</Text>
            </View>
            <View className="items-center">
              <Text className="text-2xl font-bold text-foreground">{currentIndex + 1}</Text>
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

// ---------------------------------------------------------------------------
// HomeScreen (root)
// ---------------------------------------------------------------------------
export default function HomeScreen() {
  const [view, setView] = useState<ViewState>("home");

  if (view === "home") {
    return (
      <ModeSelector
        onSelect={(mode) => setView(mode)}
        onCreatePost={() => setView("create")}
      />
    );
  }

  if (view === "create") {
    return <CreatePostScreen onBack={() => setView("home")} />;
  }

  return <DiscoverScreen mode={view} onBack={() => setView("home")} />;
}
