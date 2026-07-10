import { useState } from "react";
import { View, Text, Pressable, Image, ActivityIndicator, Platform } from "react-native";

const MAX_PHOTOS = 8;
const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? "";

interface ImagePickerFieldProps {
  urls: string[];
  onChange: (urls: string[]) => void;
}

async function uploadFiles(files: File[]): Promise<string[]> {
  const formData = new FormData();
  files.forEach((f) => formData.append("files", f));
  const res = await fetch(`${API_BASE}/api/upload`, {
    method: "POST",
    body: formData,
    credentials: "include",
  });
  if (!res.ok) throw new Error("Upload failed");
  const data = await res.json();
  return data.urls as string[];
}

export function ImagePickerField({ urls, onChange }: ImagePickerFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remaining = MAX_PHOTOS - urls.length;

  const pick = () => {
    if (Platform.OS !== "web") return; // native: extend later with expo-image-picker
    setError(null);

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = true;
    input.onchange = async () => {
      const files = Array.from(input.files ?? []).slice(0, remaining);
      if (!files.length) return;
      setUploading(true);
      try {
        const newUrls = await uploadFiles(files);
        onChange([...urls, ...newUrls].slice(0, MAX_PHOTOS));
      } catch {
        setError("Upload failed — please try again.");
      } finally {
        setUploading(false);
      }
    };
    input.click();
  };

  const remove = (index: number) => {
    onChange(urls.filter((_, i) => i !== index));
  };

  return (
    <View style={{ gap: 10 }}>
      {urls.length > 0 && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {urls.map((url, i) => (
            <View key={url + i} style={{ position: "relative" }}>
              <Image
                source={{ uri: url }}
                style={{ width: 80, height: 80, borderRadius: 8, backgroundColor: "#e5e7eb" }}
                resizeMode="cover"
              />
              <Pressable
                onPress={() => remove(i)}
                style={{
                  position: "absolute", top: -6, right: -6,
                  width: 20, height: 20, borderRadius: 10,
                  backgroundColor: "#dc2626", alignItems: "center", justifyContent: "center",
                }}
              >
                <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700", lineHeight: 14 }}>✕</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {urls.length < MAX_PHOTOS && (
        <Pressable
          onPress={pick}
          disabled={uploading}
          style={({ pressed }) => ({
            borderWidth: 2,
            borderColor: pressed ? "#e8843c" : "#ddd5c4",
            borderStyle: "dashed",
            borderRadius: 12,
            paddingVertical: 20,
            alignItems: "center",
            gap: 6,
            backgroundColor: pressed ? "#fff7f0" : "transparent",
          })}
        >
          {uploading ? (
            <ActivityIndicator color="#e8843c" />
          ) : (
            <>
              <Text style={{ fontSize: 28 }}>📷</Text>
              <Text style={{ color: "#e8843c", fontWeight: "600", fontSize: 14 }}>
                {urls.length === 0 ? "Add photos" : "Add more"}
              </Text>
              <Text style={{ color: "#9ca3af", fontSize: 12 }}>
                {urls.length}/{MAX_PHOTOS} · tap to select from camera roll
              </Text>
            </>
          )}
        </Pressable>
      )}

      {error && (
        <Text style={{ color: "#dc2626", fontSize: 13 }}>{error}</Text>
      )}
    </View>
  );
}
