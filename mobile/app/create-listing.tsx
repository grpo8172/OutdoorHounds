import {
  Text,
  View,
  Pressable,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { AppMode } from "@/lib/mockData";
import { MODES, MODE_FIELDS } from "@/lib/modes";

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

export default function CreateListingScreen() {
  const router = useRouter();
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
          <Pressable onPress={() => router.back()} className="active:opacity-70">
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
            <Pressable onPress={() => router.back()} className="active:opacity-70">
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
