import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Platform, Pressable, Text, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { startOAuthLogin } from "@/constants/oauth";
import { trpc } from "@/lib/trpc";
import { useLocalSearchParams } from "expo-router";
import { UNLOCK_PRICE_LABEL } from "@shared/const";
import { getPaypalRedirectUri } from "@/constants/paypal";
import { showAlert } from "@/lib/alert";

const isDevLoginEnabled = __DEV__ || process.env.EXPO_PUBLIC_DEV_LOGIN_ENABLED === 'true';

// Mirrors the gate pattern in app/create-listing.tsx.
function GateScreen({
  title,
  description,
  ctaLabel,
  onPress,
  devOnPress,
}: {
  title: string;
  description: string;
  ctaLabel?: string;
  onPress?: () => void;
  devOnPress?: () => void;
}) {
  return (
    <ScreenContainer className="p-6 items-center justify-center">
      <View style={{ alignItems: 'center', gap: 16, maxWidth: 320, width: '100%' }}>
        <Text style={{ fontSize: 48 }}>🔒</Text>
        <Text className="text-2xl font-bold text-foreground text-center">{title}</Text>
        <Text className="text-base text-muted text-center">{description}</Text>
        {ctaLabel && onPress && (
          <Pressable
            onPress={onPress}
            style={{
              backgroundColor: '#e8843c',
              borderRadius: 12,
              paddingVertical: 14,
              paddingHorizontal: 24,
              alignItems: 'center',
              width: '100%',
              marginTop: 8,
            }}
          >
            <Text style={{ color: '#ffffff', fontWeight: '600', fontSize: 16 }}>
              {ctaLabel}
            </Text>
          </Pressable>
        )}
        {isDevLoginEnabled && devOnPress && (
          <Pressable
            onPress={devOnPress}
            style={{
              borderRadius: 12,
              paddingVertical: 12,
              paddingHorizontal: 24,
              alignItems: 'center',
              width: '100%',
              borderWidth: 1,
              borderColor: '#7a6a58',
            }}
          >
            <Text style={{ color: '#7a6a58', fontWeight: '500', fontSize: 14 }}>
              Continue as test user (dev only)
            </Text>
          </Pressable>
        )}
      </View>
    </ScreenContainer>
  );
}

export default function SubscribeScreen() {
  const { user, isAuthenticated, devLogin } = useAuth();

  const handleDevLogin = async () => {
    try {
      await devLogin();
    } catch (err) {
      showAlert("Dev login failed", err instanceof Error ? err.message : "Please try again.");
    }
  };
  const [checkingOut, setCheckingOut] = useState(false);
  const capturedTokens = useRef(new Set<string>());
  const params = useLocalSearchParams<{ paypalStatus?: string; token?: string }>();

  const statusQuery = trpc.subscriptions.getStatus.useQuery(undefined, {
    enabled: !!user,
  });

  const createOrder = trpc.subscriptions.createOrder.useMutation();

  const captureOrder = trpc.subscriptions.captureOrder.useMutation({
    onSuccess: () => {
      statusQuery.refetch();
      showAlert("You're unlocked!", "Thanks for supporting Outdoor Hounds.");
    },
    onError: (err) => showAlert("Payment couldn't be verified", err.message),
    onSettled: () => setCheckingOut(false),
  });

  const isActive = statusQuery.data?.active ?? false;

  // Web: PayPal redirects back to this screen with our own `paypalStatus`
  // param plus PayPal's own `token` (the order id) appended.
  useEffect(() => {
    if (Platform.OS !== "web") return;
    if (params.paypalStatus !== "success" || !params.token) return;
    if (capturedTokens.current.has(params.token)) return;

    capturedTokens.current.add(params.token);
    setCheckingOut(true);
    captureOrder.mutate({ orderId: params.token });

    // Clear the query params so a refresh doesn't retrigger the capture.
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.search = "";
      window.history.replaceState({}, "", url.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.paypalStatus, params.token]);

  async function handleCheckout() {
    setCheckingOut(true);
    try {
      const returnUrl = getPaypalRedirectUri("success");
      const cancelUrl = getPaypalRedirectUri("cancel");
      const { approveUrl } = await createOrder.mutateAsync({ returnUrl, cancelUrl });

      if (Platform.OS === "web") {
        if (typeof window !== "undefined") {
          window.location.href = approveUrl;
        }
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(approveUrl, returnUrl);
      if (result.type !== "success" || !result.url) {
        setCheckingOut(false);
        return;
      }

      const resultUrl = new URL(result.url);
      const paypalStatus = resultUrl.searchParams.get("paypalStatus");
      const token = resultUrl.searchParams.get("token");

      if (paypalStatus === "success" && token) {
        captureOrder.mutate({ orderId: token });
      } else {
        setCheckingOut(false);
      }
    } catch (err) {
      setCheckingOut(false);
      showAlert(
        "Couldn't start checkout",
        err instanceof Error ? err.message : "Please try again.",
      );
    }
  }

  if (!isAuthenticated) {
    return (
      <GateScreen
        title="Create an account to unlock Outdoor Hounds"
        description="You can browse and swipe without an account, but unlocking unlimited listings requires you to be signed in first."
        ctaLabel="Sign in with Google"
        onPress={() => startOAuthLogin()}
        devOnPress={handleDevLogin}
      />
    );
  }

  return (
    <ScreenContainer className="p-0">
      <View className="flex-1 px-6 pt-10 gap-6">
        <View className="gap-1">
          <Text className="text-3xl font-bold text-foreground">
            Unlock Outdoor Hounds
          </Text>
          <Text className="text-sm text-muted">
            A one-time {UNLOCK_PRICE_LABEL} payment via PayPal unlocks unlimited
            listings — no subscription, no renewals.
          </Text>
        </View>

        {statusQuery.isLoading ? (
          <ActivityIndicator />
        ) : isActive ? (
          <View className="bg-surface rounded-lg p-4 border border-border gap-1">
            <Text className="text-base font-semibold text-foreground">
              You&apos;re unlocked
            </Text>
            <Text className="text-sm text-muted">
              Thanks for your support — everything is available to you.
            </Text>
          </View>
        ) : (
          <Pressable
            onPress={handleCheckout}
            disabled={checkingOut}
            className="rounded-lg py-3 items-center active:opacity-70 disabled:opacity-50"
            style={{ backgroundColor: "#e8843c" }}
          >
            {checkingOut ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="font-semibold" style={{ color: "#a8d4b8" }}>
                Unlock for {UNLOCK_PRICE_LABEL} via PayPal
              </Text>
            )}
          </Pressable>
        )}
      </View>
    </ScreenContainer>
  );
}
