import { useState, useRef, useEffect } from "react";
import { ScrollView, Text, View, Pressable, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";

export default function ChatScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const convId = parseInt(conversationId, 10);
  const { user } = useAuth();
  const [body, setBody] = useState("");
  const scrollRef = useRef<ScrollView>(null);

  const messagesQuery = trpc.messages.getMessages.useQuery(
    { conversationId: convId },
    { enabled: !isNaN(convId), refetchInterval: 5_000 },
  );

  const sendMutation = trpc.messages.sendMessage.useMutation({
    onSuccess: () => {
      setBody("");
      messagesQuery.refetch();
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
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
          contentContainerStyle={{ padding: 16, gap: 10 }}
          showsVerticalScrollIndicator={false}
        >
          {msgs.length === 0 && (
            <View style={{ alignItems: "center", paddingTop: 40, gap: 8 }}>
              <Text style={{ fontSize: 28 }}>👋</Text>
              <Text style={{ color: "#9ca3af", textAlign: "center", fontSize: 14 }}>
                Say hello! You can negotiate pricing,{"\n"}share contact details, and arrange payment here.
              </Text>
              <Text style={{ color: "#d1d5db", fontSize: 12, textAlign: "center", marginTop: 4 }}>
                Payments between you and the lister are arranged privately — this is a private conversation.
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
        </ScrollView>

        {/* Input bar */}
        <View style={{ flexDirection: "row", alignItems: "flex-end", padding: 12, gap: 8, borderTopWidth: 1, borderTopColor: "#e5e7eb", backgroundColor: "#fff" }}>
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="Message…"
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
