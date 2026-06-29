import { ScrollView, Text, View, Pressable, Image, FlatList } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useSwipeProfiles } from "@/hooks/use-swipe-profiles";
import { useState } from "react";

type Tab = "liked" | "enquiries";

export default function InteractionsScreen() {
  const { likedProfiles, removeLiked } = useSwipeProfiles();
  const [activeTab, setActiveTab] = useState<Tab>("liked");

  const enquiries = [
    {
      id: "e1",
      profileId: "1",
      profileName: "Max",
      message: "Interested in hiking this weekend",
      status: "pending" as const,
      date: "2024-01-15",
    },
    {
      id: "e2",
      profileId: "3",
      profileName: "Jenna's Pet Sitting",
      message: "Would like to book a walk for Monday",
      status: "approved" as const,
      date: "2024-01-14",
    },
  ];

  return (
    <ScreenContainer className="p-0">
      {/* Tab Navigation */}
      <View className="flex-row border-b border-border bg-background">
        <Pressable
          onPress={() => setActiveTab("liked")}
          className={`flex-1 py-4 items-center border-b-2 ${
            activeTab === "liked" ? "border-primary" : "border-transparent"
          }`}
        >
          <Text
            className={`font-semibold ${
              activeTab === "liked" ? "text-primary" : "text-muted"
            }`}
          >
            Liked ({likedProfiles.length})
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab("enquiries")}
          className={`flex-1 py-4 items-center border-b-2 ${
            activeTab === "enquiries" ? "border-primary" : "border-transparent"
          }`}
        >
          <Text
            className={`font-semibold ${
              activeTab === "enquiries" ? "text-primary" : "text-muted"
            }`}
          >
            Enquiries ({enquiries.length})
          </Text>
        </Pressable>
      </View>

      <ScrollView className="flex-1 px-4 py-4">
        {activeTab === "liked" ? (
          <View className="gap-3">
            {likedProfiles.length === 0 ? (
              <View className="items-center justify-center py-12">
                <Text className="text-lg text-muted">
                  No liked profiles yet
                </Text>
                <Text className="text-sm text-muted mt-2">
                  Start swiping to save profiles
                </Text>
              </View>
            ) : (
              likedProfiles.map((profile) => (
                <Pressable
                  key={profile.id}
                  className="bg-surface rounded-lg overflow-hidden border border-border flex-row active:opacity-70"
                >
                  <Image
                    source={{ uri: profile.images[0] }}
                    className="w-24 h-24"
                    resizeMode="cover"
                  />
                  <View className="flex-1 p-3 justify-between">
                    <View>
                      <Text className="text-base font-bold text-foreground">
                        {profile.name}
                      </Text>
                      {profile.breed && (
                        <Text className="text-sm text-muted">
                          {profile.breed}
                        </Text>
                      )}
                      <Text className="text-xs text-muted mt-1">
                        {profile.location}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => removeLiked(profile.id)}
                      className="self-start bg-error/10 rounded px-2 py-1 mt-2 active:opacity-70"
                    >
                      <Text className="text-xs font-semibold text-error">
                        Remove
                      </Text>
                    </Pressable>
                  </View>
                </Pressable>
              ))
            )}
          </View>
        ) : (
          <View className="gap-3">
            {enquiries.length === 0 ? (
              <View className="items-center justify-center py-12">
                <Text className="text-lg text-muted">No enquiries yet</Text>
                <Text className="text-sm text-muted mt-2">
                  Submit enquiries to profiles to see them here
                </Text>
              </View>
            ) : (
              enquiries.map((enquiry) => (
                <Pressable
                  key={enquiry.id}
                  className="bg-surface rounded-lg p-4 border border-border active:opacity-70"
                >
                  <View className="flex-row justify-between items-start mb-2">
                    <Text className="text-base font-bold text-foreground">
                      {enquiry.profileName}
                    </Text>
                    <View
                      className={`rounded-full px-2 py-1 ${
                        enquiry.status === "pending"
                          ? "bg-warning/10"
                          : enquiry.status === "approved"
                            ? "bg-success/10"
                            : "bg-error/10"
                      }`}
                    >
                      <Text
                        className={`text-xs font-semibold capitalize ${
                          enquiry.status === "pending"
                            ? "text-warning"
                            : enquiry.status === "approved"
                              ? "text-success"
                              : "text-error"
                        }`}
                      >
                        {enquiry.status}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-sm text-foreground mb-2">
                    {enquiry.message}
                  </Text>
                  <Text className="text-xs text-muted">{enquiry.date}</Text>
                </Pressable>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
