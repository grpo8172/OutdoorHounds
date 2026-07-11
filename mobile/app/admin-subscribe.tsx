import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Platform, Pressable, Text, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { startOAuthLogin } from "@/constants/oauth";
import { trpc } from "@/lib/trpc";
import { useLocalSearchParams } from "expo-router";
import { ADMIN_UNLOCK_PRICE_LABEL } from "@shared/const";
import { getPaypalRedirectUri } from "@/constants/paypal";
import { showAlert } from "@/lib/alert";

const isDevLoginEnabled = __DEV__ || process.env.EXPO_PUBLIC_DEV_LOGIN_ENABLED === "true";

export default function AdminSubscribeScreen() {
  const { user, isAuthenticated, devLogin } = useAuth();
  const [checkingOut, setCheckingOut] = useState(false);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const capturedTokens = useRef(new Set<string>());
  const params = useLocalSearchParams<{ paypalStatus?: string; token?: string }>();

  const statusQuery = trpc.subscriptions.getAdminStatus.useQuery(undefined, {
    enabled: !!user,
  });

  const createOrder = trpc.subscriptions.createAdminOrder.useMutation();

  const captureOrder = trpc.subscriptions.captureAdminOrder.useMutation({
    onSuccess: (data) => {
      statusQuery.refetch();
      if (data.adminToken) setAdminToken(data.adminToken);
    },
    onError: (err) => showAlert("Payment couldn't be verified", err.message),
    onSettled: () => setCheckingOut(false),
  });

  useEffect(() => {
    if (statusQuery.data?.active && statusQuery.data.adminToken) {
      setAdminToken(statusQuery.data.adminToken);
    }
  }, [statusQuery.data]);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    if (params.paypalStatus !== "success" || !params.token) return;
    if (capturedTokens.current.has(params.token)) return;

    capturedTokens.current.add(params.token);
    setCheckingOut(true);
    captureOrder.mutate({ orderId: params.token });

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
        if (typeof window !== "undefined") window.location.href = approveUrl;
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(approveUrl, returnUrl);
      if (result.type !== "success" || !result.url) { setCheckingOut(false); return; }

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
      showAlert("Couldn't start checkout", err instanceof Error ? err.message : "Please try again.");
    }
  }

  async function handleCopy() {
    if (!adminToken) return;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(adminToken);
      }
    } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!isAuthenticated) {
    return (
      <ScreenContainer className="p-6 items-center justify-center">
        <View style={{ alignItems: "center", gap: 16, maxWidth: 320, width: "100%" }}>
          <Text style={{ fontSize: 48 }}>🔒</Text>
          <Text className="text-2xl font-bold text-foreground text-center">Sign in first</Text>
          <Text className="text-base text-muted text-center">
            You need a profile before purchasing admin access.
          </Text>
          <Pressable
            onPress={() => startOAuthLogin()}
            style={{ backgroundColor: "#e8843c", borderRadius: 12, paddingVertical: 14, paddingHorizontal: 24, width: "100%" }}
          >
            <Text style={{ color: "#fff", fontWeight: "600", fontSize: 16, textAlign: "center" }}>Sign in with Google</Text>
          </Pressable>
          {isDevLoginEnabled && (
            <Pressable
              onPress={() => devLogin().catch(() => {})}
              style={{ borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24, width: "100%", borderWidth: 1, borderColor: "#7a6a58" }}
            >
              <Text style={{ color: "#7a6a58", fontWeight: "500", fontSize: 14, textAlign: "center" }}>Try it out</Text>
            </Pressable>
          )}
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="p-0">
      <View className="flex-1 px-6 pt-10 gap-6">
        <View className="gap-1">
          <Text className="text-3xl font-bold text-foreground">Admin Access</Text>
          <Text className="text-sm text-muted">
            A one-time {ADMIN_UNLOCK_PRICE_LABEL} payment gives you an admin access token
            you can use to manage your Outdoor Hounds site.
          </Text>
        </View>

        {statusQuery.isLoading ? (
          <ActivityIndicator />
        ) : adminToken ? (
          <View className="bg-surface rounded-lg p-4 border border-border gap-3">
            <Text className="text-base font-semibold text-foreground">Your admin access token</Text>
            <Text className="text-sm text-muted">
              Copy this token and use it to sign in to the admin panel on the website.
              Keep it private — anyone with this token can access your admin area.
            </Text>
            <View style={{ backgroundColor: "#f3f4f6", borderRadius: 8, padding: 12 }}>
              <Text style={{ fontFamily: "monospace", fontSize: 13, color: "#374151", letterSpacing: 0.5 }}>
                {adminToken}
              </Text>
            </View>
            <Pressable
              onPress={handleCopy}
              style={{ backgroundColor: copied ? "#16a34a" : "#e8843c", borderRadius: 10, paddingVertical: 12, alignItems: "center" }}
            >
              <Text style={{ color: "#fff", fontWeight: "600" }}>{copied ? "Copied!" : "Copy token"}</Text>
            </Pressable>
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
              <Text className="font-semibold" style={{ color: "#fff" }}>
                Unlock admin for {ADMIN_UNLOCK_PRICE_LABEL} via PayPal
              </Text>
            )}
          </Pressable>
        )}
      </View>
    </ScreenContainer>
  );
}
