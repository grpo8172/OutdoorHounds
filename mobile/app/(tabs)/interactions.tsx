import { ScrollView, Text, View, Pressable, Image, ActivityIndicator } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { router } from "expo-router";
import { useState } from "react";
import { startOAuthLogin } from "@/constants/oauth";
import { showAlert } from "@/lib/alert";
import { isPaywallError, isGuestLimitError, isDailyCapError } from "@/lib/trpc-error";

type Tab = "saved" | "chats";

function SignInPrompt() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 16 }}>
      <Text style={{ fontSize: 40 }}>💬</Text>
      <Text style={{ fontSize: 20, fontWeight: "700", textAlign: "center", color: "#1a1a1a" }}>
        Sign in to save listings & chat
      </Text>
      <Text style={{ fontSize: 14, color: "#6b7280", textAlign: "center", lineHeight: 20 }}>
        Create a free profile to keep track of listings you're interested in and message listers directly.
      </Text>
      <Pressable
        onPress={() => router.push("/create-profile")}
        style={{ backgroundColor: "#e8843c", borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32, marginTop: 8 }}
      >
        <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>Create a profile</Text>
      </Pressable>
    </View>
  );
}

export default function InteractionsScreen() {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("saved");

  const savedItemsQuery = trpc.messages.getSavedItems.useQuery(undefined, {
    enabled: !!user,
  });

  const conversationsQuery = trpc.messages.getMyConversations.useQuery(undefined, {
    enabled: !!user,
    refetchInterval: 10_000,
  });

  const startChatMutation = trpc.messages.startConversation.useMutation({
    onSuccess: (conv) => router.push(`/chat/${conv.id}`),
    onError: (err) => {
      if (isDailyCapError(err)) {
        showAlert("Daily limit reached", "Pay $10 for 40 more chats today.");
        router.push("/subscribe");
        return;
      }
      if (isPaywallError(err)) { router.push("/subscribe"); return; }
      if (isGuestLimitError(err)) {
        showAlert("Daily limit reached", "Sign in to keep chatting.");
        startOAuthLogin();
        return;
      }
      showAlert("Couldn't start chat", err.message || "Please try again.");
    },
  });

  function handleMessage(itemId: number) {
    if (!user) return router.push("/create-profile");
    startChatMutation.mutate({ itemId });
  }

  return (
    <ScreenContainer className="p-0">
      {/* Tab bar */}
      <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e5e7eb", backgroundColor: "#fff" }}>
        {(["saved", "chats"] as Tab[]).map((tab) => {
          const count = tab === "saved"
            ? (savedItemsQuery.data?.length ?? 0)
            : (conversationsQuery.data?.length ?? 0);
          return (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={{
                flex: 1, paddingVertical: 14, alignItems: "center",
                borderBottomWidth: 2,
                borderBottomColor: activeTab === tab ? "#e8843c" : "transparent",
              }}
            >
              <Text style={{ fontWeight: "600", color: activeTab === tab ? "#e8843c" : "#9ca3af" }}>
                {tab === "saved" ? `Saved (${count})` : `Chats (${count})`}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {authLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color="#e8843c" />
        </View>
      ) : !user ? (
        <SignInPrompt />
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 12 }}>
          {activeTab === "saved" ? (
            savedItemsQuery.isLoading ? (
              <View style={{ alignItems: "center", paddingTop: 48 }}>
                <ActivityIndicator color="#e8843c" />
              </View>
            ) : !savedItemsQuery.data?.length ? (
              <View style={{ alignItems: "center", paddingTop: 48, gap: 8 }}>
                <Text style={{ fontSize: 32 }}>👆</Text>
                <Text style={{ fontSize: 16, color: "#9ca3af", textAlign: "center" }}>
                  Swipe right on listings to save them here
                </Text>
              </View>
            ) : (
              savedItemsQuery.data.map((item) => (
                <View
                  key={item.id}
                  style={{ flexDirection: "row", backgroundColor: "#fff", borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: "#e5e7eb" }}
                >
                  {item.imageUrl ? (
                    <Image source={{ uri: item.imageUrl }} style={{ width: 88, height: 88 }} resizeMode="cover" />
                  ) : (
                    <View style={{ width: 88, height: 88, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontSize: 28 }}>🐾</Text>
                    </View>
                  )}
                  <View style={{ flex: 1, padding: 12, justifyContent: "space-between" }}>
                    <View>
                      <Text style={{ fontWeight: "700", fontSize: 15, color: "#1a1a1a" }}>{item.name}</Text>
                      {(item.listingMeta as any)?.location && (
                        <Text style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>
                          📍 {(item.listingMeta as any).location}
                        </Text>
                      )}
                      {item.price && (
                        <Text style={{ fontSize: 12, color: "#e8843c", fontWeight: "600", marginTop: 2 }}>{item.price}</Text>
                      )}
                    </View>
                    <Pressable
                      onPress={() => handleMessage(item.id)}
                      disabled={startChatMutation.isPending}
                      style={{ alignSelf: "flex-start", backgroundColor: "#e8843c", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6, marginTop: 6 }}
                    >
                      <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>
                        {startChatMutation.isPending ? "Opening…" : "💬 Message"}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ))
            )
          ) : (
            conversationsQuery.data?.length === 0 ? (
              <View style={{ alignItems: "center", paddingTop: 48, gap: 8 }}>
                <Text style={{ fontSize: 32 }}>💬</Text>
                <Text style={{ fontSize: 16, color: "#9ca3af" }}>No chats yet — save a listing and tap Message</Text>
              </View>
            ) : (
              (conversationsQuery.data ?? []).map((conv) => (
                <Pressable
                  key={conv.id}
                  onPress={() => router.push(`/chat/${conv.id}`)}
                  style={{ backgroundColor: "#fff", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#e5e7eb", gap: 4 }}
                >
                  <Text style={{ fontWeight: "700", fontSize: 15, color: "#1a1a1a" }}>{conv.itemName ?? "Listing"}</Text>
                  <Text style={{ fontSize: 13, color: "#6b7280" }} numberOfLines={1}>
                    {conv.lastMessage ?? "No messages yet — say hello!"}
                  </Text>
                </Pressable>
              ))
            )
          )}
        </ScrollView>
      )}
    </ScreenContainer>
  );
}
