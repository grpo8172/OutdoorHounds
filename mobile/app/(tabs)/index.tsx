import { Image, ScrollView, Text, View, Pressable, Linking } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { MODES } from "@/lib/modes";
import { useAuth } from "@/hooks/use-auth";
import { startOAuthLogin } from "@/constants/oauth";

const WEB_BASE_URL = process.env.EXPO_PUBLIC_WEB_URL || "http://localhost:8000";

export default function HomeScreen() {
  const router = useRouter();
  const { user, loading } = useAuth();

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
            onPress={() => router.push(`/discover/${mode.id}`)}
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
          onPress={() => router.push("/create-listing")}
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

        {/* Website CTA */}
        <Pressable
          onPress={() => Linking.openURL(WEB_BASE_URL)}
          style={{
            width: "100%",
            borderRadius: 16,
            backgroundColor: "#e8843c",
            paddingVertical: 16,
            paddingHorizontal: 20,
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
          }}
          className="active:opacity-80"
        >
          <Text style={{ fontSize: 28 }}>🌐</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>Visit the Website</Text>
            <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: 2 }}>
              Set up your profile · manage payments · create listings
            </Text>
          </View>
          <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 18 }}>→</Text>
        </Pressable>

        {/* Sign-in nudge for guests */}
        {!loading && !user && (
          <Pressable
            onPress={() => startOAuthLogin()}
            style={{
              width: "100%", borderRadius: 16, borderWidth: 1.5,
              borderColor: "#e8843c", paddingVertical: 14, paddingHorizontal: 20,
              flexDirection: "row", alignItems: "center", gap: 14,
            }}
            className="active:opacity-80"
          >
            <Text style={{ fontSize: 24 }}>👤</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "700", fontSize: 15, color: "#e8843c" }}>Create a profile</Text>
              <Text style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>
                Save listings · chat with listers · arrange payment privately
              </Text>
            </View>
            <Text style={{ color: "#e8843c", fontSize: 16 }}>→</Text>
          </Pressable>
        )}

        <Text className="text-center text-xs text-muted" style={{ marginTop: 4 }}>
          Tap a card to start browsing
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
}
