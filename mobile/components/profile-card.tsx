import { useRef } from "react";
import { Image, Text, View, Pressable, Animated, PanResponder } from "react-native";
import { Profile } from "@/lib/mockData";

const SWIPE_THRESHOLD = 100;

interface ProfileCardProps {
  profile: Profile;
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
  currentIndex: number;
  totalProfiles: number;
}

export function ProfileCard({
  profile,
  onSwipeRight,
  onSwipeLeft,
  currentIndex,
  totalProfiles,
}: ProfileCardProps) {
  const position = useRef(new Animated.ValueXY()).current;

  const panResponder = useRef(
    PanResponder.create({
      // Don't capture on initial press — let inner buttons handle taps
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderMove: (_, gesture) => {
        position.setValue({ x: gesture.dx, y: gesture.dy * 0.15 });
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > SWIPE_THRESHOLD) {
          Animated.timing(position, {
            toValue: { x: 500, y: gesture.dy },
            duration: 180,
            useNativeDriver: true,
          }).start(() => {
            position.setValue({ x: 0, y: 0 });
            onSwipeRight?.();
          });
        } else if (gesture.dx < -SWIPE_THRESHOLD) {
          Animated.timing(position, {
            toValue: { x: -500, y: gesture.dy },
            duration: 180,
            useNativeDriver: true,
          }).start(() => {
            position.setValue({ x: 0, y: 0 });
            onSwipeLeft?.();
          });
        } else {
          Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: true,
            friction: 5,
          }).start();
        }
      },
    })
  ).current;

  const rotate = position.x.interpolate({
    inputRange: [-300, 0, 300],
    outputRange: ["-12deg", "0deg", "12deg"],
    extrapolate: "clamp",
  });

  const saveOpacity = position.x.interpolate({
    inputRange: [20, SWIPE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const skipOpacity = position.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD, -20],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={{
        transform: [
          { translateX: position.x },
          { translateY: position.y },
          { rotate },
        ],
        borderRadius: 16,
        backgroundColor: "white",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.08)",
      }}
    >
      {/* Image */}
      <View style={{ width: "100%", height: 200, backgroundColor: "#e5e7eb", position: "relative", borderTopLeftRadius: 16, borderTopRightRadius: 16, overflow: "hidden" }}>
        <Image
          source={{ uri: profile.images[0] }}
          style={{ width: "100%", height: "100%" }}
          resizeMode="cover"
        />

        {/* SAVE badge */}
        <Animated.View
          style={{
            opacity: saveOpacity,
            position: "absolute",
            top: 20,
            left: 16,
            borderWidth: 3,
            borderColor: "#16a34a",
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 4,
            transform: [{ rotate: "-15deg" }],
          }}
        >
          <Text style={{ color: "#16a34a", fontSize: 22, fontWeight: "800" }}>SAVE</Text>
        </Animated.View>

        {/* SKIP badge */}
        <Animated.View
          style={{
            opacity: skipOpacity,
            position: "absolute",
            top: 20,
            right: 16,
            borderWidth: 3,
            borderColor: "#dc2626",
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 4,
            transform: [{ rotate: "15deg" }],
          }}
        >
          <Text style={{ color: "#dc2626", fontSize: 22, fontWeight: "800" }}>SKIP</Text>
        </Animated.View>

        {/* Counter badge */}
        <View
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            backgroundColor: "rgba(0,0,0,0.45)",
            borderRadius: 20,
            paddingHorizontal: 10,
            paddingVertical: 3,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 11, fontWeight: "600" }}>
            {currentIndex + 1} / {totalProfiles}
          </Text>
        </View>
      </View>

      {/* Content */}
      <View style={{ padding: 16, gap: 6 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 22, fontWeight: "700", color: "#1a1a1a" }}>{profile.name}</Text>
            {profile.breed && <Text style={{ fontSize: 13, color: "#6b7280" }}>{profile.breed}</Text>}
            {profile.age && <Text style={{ fontSize: 13, color: "#6b7280" }}>{profile.age} years old</Text>}
          </View>
          {profile.rating && (
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#e8843c" }}>⭐ {profile.rating}</Text>
          )}
        </View>

        <Text style={{ fontSize: 13, color: "#6b7280" }}>📍 {profile.location}{profile.distance ? ` • ${profile.distance}km away` : ""}</Text>

        <Text style={{ fontSize: 13, color: "#374151", lineHeight: 20, marginTop: 4 }}>
          {profile.description.substring(0, 100)}{profile.description.length > 100 ? "..." : ""}
        </Text>

        {profile.price && (
          <Text style={{ fontSize: 13, fontWeight: "600", color: "#e8843c", marginTop: 2 }}>{profile.price}</Text>
        )}

      </View>
    </Animated.View>
  );
}
