import { useState, useRef, useEffect } from "react";
import { ScrollView, Text, View, Pressable, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";
import { showAlert } from "@/lib/alert";
import { startOAuthLogin } from "@/constants/oauth";
import { isPaywallError, isGuestLimitError, isDailyCapError } from "@/lib/trpc-error";
import { useActiveTenant } from "@/hooks/use-active-tenant";

const SEEKING_LABELS: Record<string, string> = {
  adopt_or_foster: "🐾 Adopt / Foster",
  pet_services: "🦮 Pet Services",
  pet_events: "🎉 Events",
  stalls_and_shops: "🛍️ Shops",
  lost_and_found: "🔍 Lost & Found",
  mini_petting_zoo_bookings: "🐑 Petting Zoo",
};

function BuyerProfileCard({ profile }: { profile: { displayName: string | null; bio: string | null; location: string | null; preferredModesJson: unknown } }) {
  const modes = Array.isArray(profile.preferredModesJson) ? profile.preferredModesJson as string[] : [];
  return (
    <View style={{ margin: 12, backgroundColor: "#fff7f0", borderRadius: 14, padding: 16, borderWidth: 1.5, borderColor: "#e8843c" }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "#e8843c", alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>
            {profile.displayName?.[0]?.toUpperCase() ?? "?"}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: "#111" }}>{profile.displayName ?? "Anonymous"}</Text>
          {profile.location ? (
            <Text style={{ fontSize: 12, color: "#9ca3af" }}>📍 {profile.location}</Text>
          ) : null}
        </View>
        <View style={{ backgroundColor: "#e8843c", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
          <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>THEIR PROFILE</Text>
        </View>
      </View>

      {profile.bio ? (
        <Text style={{ fontSize: 13, color: "#374151", lineHeight: 19, marginBottom: 8 }}>{profile.bio}</Text>
      ) : null}

      {modes.length > 0 && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 5 }}>
          {modes.map(m => (
            <View key={m} style={{ backgroundColor: "#fff", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: "#fcd9a8" }}>
              <Text style={{ fontSize: 11, color: "#e8843c", fontWeight: "600" }}>{SEEKING_LABELS[m] ?? m}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export default function ChatScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const convId = parseInt(conversationId, 10);
  const { user } = useAuth();
  const { chatGreeting, chatPlaceholder, chatDisclaimer } = useActiveTenant();
  const [body, setBody] = useState("");
  const scrollRef = useRef<ScrollView>(null);

  const messagesQuery = trpc.messages.getMessages.useQuery(
    { conversationId: convId },
    { enabled: !isNaN(convId), refetchInterval: 5_000 },
  );

  const profileQuery = trpc.messages.getConversationProfile.useQuery(
    { conversationId: convId },
    { enabled: !isNaN(convId) },
  );

  const sendMutation = trpc.messages.sendMessage.useMutation({
    onSuccess: () => {
      setBody("");
      messagesQuery.refetch();
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    },
    onError: (err) => {
      if (isDailyCapError(err)) {
        showAlert("Daily limit reached", "Pay $10 for 40 more messages today.");
        router.push("/subscribe");
        return;
      }
      if (isPaywallError(err)) { router.push("/subscribe"); return; }
      if (isGuestLimitError(err)) {
        showAlert("Daily limit reached", "Sign in to keep messaging.");
        startOAuthLogin();
        return;
      }
      showAlert("Message failed to send", err.message || "Please try again.");
    },
  });

  useEffect(() => {
    if (messagesQuery.data?.length) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 100);
    }
  }, [messagesQuery.data?.length]);

  function send() {
    if (!body.trim() || sendMutation.isPending) return;
    sendMutation.mutate({ conversationId: convId, body: body.trim() });
  }

  const msgs = messagesQuery.data ?? [];
  const buyerProfile = profileQuery.data;

  return (
    <ScreenContainer className="p-0">
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "#e5e7eb", backgroundColor: "#fff", gap: 12 }}>
        <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
          <Text style={{ fontSize: 22, color: "#e8843c" }}>←</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: "700", fontSize: 16, color: "#1a1a1a" }}>Message thread</Text>
          <Text style={{ fontSize: 12, color: "#9ca3af" }}>Negotiate details &amp; arrange payment privately</Text>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 16, gap: 10 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Buyer profile card — shown to the lister so they know who they're talking to */}
          {buyerProfile && buyerProfile.displayName && (
            <BuyerProfileCard profile={buyerProfile as any} />
          )}

          <View style={{ padding: 16, gap: 10 }}>
            {msgs.length === 0 && (
              <View style={{ alignItems: "center", paddingTop: 32, gap: 8 }}>
                <Text style={{ fontSize: 28 }}>👋</Text>
                <Text style={{ color: "#9ca3af", textAlign: "center", fontSize: 14 }}>
                  {chatGreeting ?? "Say hello! Negotiate pricing,\nshare contact details, and arrange payment here."}
                </Text>
                <Text style={{ color: "#d1d5db", fontSize: 12, textAlign: "center", marginTop: 4 }}>
                  This is a private conversation.
                </Text>
              </View>
            )}

            {msgs.map((msg) => {
              const isMe = msg.senderId === user?.id;
              return (
                <View
                  key={msg.id}
                  style={{
                    alignSelf: isMe ? "flex-end" : "flex-start",
                    maxWidth: "78%",
                    backgroundColor: isMe ? "#e8843c" : "#f3f4f6",
                    borderRadius: 16,
                    borderBottomRightRadius: isMe ? 4 : 16,
                    borderBottomLeftRadius: isMe ? 16 : 4,
                    padding: 12,
                    gap: 4,
                  }}
                >
                  <Text style={{ color: isMe ? "#fff" : "#1a1a1a", fontSize: 14, lineHeight: 20 }}>{msg.body}</Text>
                  <Text style={{ color: isMe ? "rgba(255,255,255,0.65)" : "#9ca3af", fontSize: 10, alignSelf: isMe ? "flex-end" : "flex-start" }}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                </View>
              );
            })}
          </View>
        </ScrollView>

        {/* Disclaimer */}
        {chatDisclaimer && (
          <Text style={{ fontSize: 11, color: "#9ca3af", textAlign: "center", paddingHorizontal: 16, paddingTop: 6 }}>
            {chatDisclaimer}
          </Text>
        )}

        {/* Input bar */}
        <View style={{ flexDirection: "row", alignItems: "flex-end", padding: 12, gap: 8, borderTopWidth: 1, borderTopColor: "#e5e7eb", backgroundColor: "#fff" }}>
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder={chatPlaceholder ?? "Message…"}
            multiline
            style={{ flex: 1, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, maxHeight: 100, backgroundColor: "#f9fafb" }}
            onSubmitEditing={send}
            returnKeyType="send"
          />
          <Pressable
            onPress={send}
            disabled={!body.trim() || sendMutation.isPending}
            style={{ backgroundColor: body.trim() ? "#e8843c" : "#e5e7eb", borderRadius: 20, padding: 10, alignItems: "center", justifyContent: "center" }}
          >
            <Text style={{ color: "#fff", fontSize: 18, lineHeight: 20 }}>↑</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
