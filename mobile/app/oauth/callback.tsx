import { ThemedView } from "@/components/themed-view";
import * as Auth from "@/lib/_core/auth";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function OAuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    sessionToken?: string;
    user?: string;
    error?: string;
  }>();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      if (params.error) {
        setStatus("error");
        setErrorMessage(params.error);
        return;
      }

      if (!params.sessionToken) {
        setStatus("error");
        setErrorMessage("Missing session token");
        return;
      }

      try {
        await Auth.setSessionToken(params.sessionToken);

        if (params.user) {
          try {
            const userJson =
              typeof atob !== "undefined"
                ? atob(params.user)
                : Buffer.from(params.user, "base64").toString("utf-8");
            const userData = JSON.parse(userJson);
            const userInfo: Auth.User = {
              id: userData.id,
              openId: userData.openId,
              name: userData.name,
              email: userData.email,
              loginMethod: userData.loginMethod,
              lastSignedIn: new Date(userData.lastSignedIn || Date.now()),
            };
            await Auth.setUserInfo(userInfo);
          } catch (err) {
            console.error("[OAuth] Failed to parse user data:", err);
          }
        }

        setStatus("success");
        setTimeout(() => {
          router.replace("/(tabs)");
        }, 1000);
      } catch (error) {
        console.error("[OAuth] Callback error:", error);
        setStatus("error");
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to complete authentication",
        );
      }
    };

    handleCallback();
  }, [params.sessionToken, params.user, params.error, router]);

  return (
    <SafeAreaView className="flex-1" edges={["top", "bottom", "left", "right"]}>
      <ThemedView className="flex-1 items-center justify-center gap-4 p-5">
        {status === "processing" && (
          <>
            <ActivityIndicator size="large" />
            <Text className="mt-4 text-base leading-6 text-center text-foreground">
              Completing authentication...
            </Text>
          </>
        )}
        {status === "success" && (
          <>
            <Text className="text-base leading-6 text-center text-foreground">
              Authentication successful!
            </Text>
            <Text className="text-base leading-6 text-center text-foreground">
              Redirecting...
            </Text>
          </>
        )}
        {status === "error" && (
          <>
            <Text className="mb-2 text-xl font-bold leading-7 text-error">
              Authentication failed
            </Text>
            <Text className="text-base leading-6 text-center text-foreground">
              {errorMessage}
            </Text>
          </>
        )}
      </ThemedView>
    </SafeAreaView>
  );
}
