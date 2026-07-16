import { Image, ScrollView, Text, View, Pressable, Linking } from "react-native";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { useActiveTenant } from "@/hooks/use-active-tenant";
import { mergeTenantModes } from "@/lib/tenant-modes";

const WEB_BASE_URL = process.env.EXPO_PUBLIC_WEB_URL || "http://localhost:8000";
const DEFAULT_BRAND_COLOR = "#e8843c";

export default function HomeScreen() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const {
    isNonDefault, businessName, siteEmoji: tenantEmoji, slug,
    brandColor, backgroundColor, heroPhoto, tagline, modeConfig, leave,
  } = useActiveTenant();

  const siteName = businessName ?? "Outdoor Hounds";
  const siteEmoji = tenantEmoji ?? "🐾";
  const brand = brandColor ?? DEFAULT_BRAND_COLOR;
  const modes = useMemo(() => mergeTenantModes(modeConfig), [modeConfig]);

  return (
    <ScreenContainer containerStyle={backgroundColor ? { backgroundColor } : undefined}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 100, gap: 12 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ gap: 2, paddingTop: 4, marginBottom: 4 }}>
          {heroPhoto && (
            <View style={{ height: 140, borderRadius: 16, overflow: "hidden", marginBottom: 12 }}>
              <Image
                source={{ uri: heroPhoto }}
                onError={() => {}}
                style={{ position: "absolute", width: "100%", height: "100%" }}
                resizeMode="cover"
              />
              <View style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.45)" }} />
              <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 16 }}>
                <Text style={{ fontSize: 24, fontWeight: "700", color: "#fff" }}>{siteEmoji} {siteName}</Text>
                <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.9)", marginTop: 2 }}>
                  {tagline ?? "What are you looking for today?"}
                </Text>
              </View>
            </View>
          )}
          {!heroPhoto && (
            <>
              <Text className="text-3xl font-bold text-foreground">{siteEmoji} {siteName}</Text>
              <Text className="text-sm text-muted">{tagline ?? "What are you looking for today?"}</Text>
            </>
          )}
        </View>

        {isNonDefault && (
          <View
            style={{
              flexDirection: "row", alignItems: "center", gap: 8,
              borderRadius: 999, backgroundColor: "#fff7f0",
              paddingHorizontal: 14, paddingVertical: 8, alignSelf: "flex-start",
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: "600", color: "#92400e" }}>
              {tenantEmoji ?? "🏘️"} Browsing {businessName ?? "this community"}
            </Text>
            <Pressable onPress={leave} hitSlop={8} style={{ borderLeftWidth: 1, borderLeftColor: "#fcd9a8", paddingLeft: 8 }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: "#92400e", textDecorationLine: "underline" }}>
                Leave
              </Text>
            </Pressable>
          </View>
        )}

        {modes.map((mode) => (
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

        {/* Sign-in nudge for guests */}
        {!loading && !user && (
          <Pressable
            onPress={() => router.push("/create-profile")}
            style={{
              width: "100%", borderRadius: 16, borderWidth: 1.5,
              borderColor: brand, paddingVertical: 14, paddingHorizontal: 20,
              flexDirection: "row", alignItems: "center", gap: 14,
            }}
          >
            <Text style={{ fontSize: 24 }}>👤</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "700", fontSize: 15, color: brand }}>Create a profile</Text>
              <Text style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>
                Save listings · chat with listers · arrange payment privately
              </Text>
            </View>
            <Text style={{ color: brand, fontSize: 16 }}>→</Text>
          </Pressable>
        )}

        {/* Website CTA */}
        <Pressable
          onPress={() => Linking.openURL(isNonDefault && slug ? `${WEB_BASE_URL}/t/${slug}` : WEB_BASE_URL)}
          style={{
            width: "100%",
            borderRadius: 16,
            backgroundColor: brand,
            paddingVertical: 16,
            paddingHorizontal: 20,
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
          }}
        >
          <Text style={{ fontSize: 28 }}>🌐</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>Manage Admin</Text>
            <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: 2 }}>
              Access admin tools · set up your business · manage payments
            </Text>
          </View>
          <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 18 }}>→</Text>
        </Pressable>

        <Text className="text-center text-xs text-muted" style={{ marginTop: 4 }}>
          Tap a card to start browsing
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
}
