import { Image, ScrollView, Text, View, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { MODES } from "@/lib/modes";

export default function HomeScreen() {
  const router = useRouter();

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

        <Text className="text-center text-xs text-muted" style={{ marginTop: 4 }}>
          Tap a card to start browsing
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
}
