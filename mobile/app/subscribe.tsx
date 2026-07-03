import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  Text,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { useRouter } from "expo-router";
import { UNLOCK_PRICE_LABEL } from "@shared/const";

// From the PayPal dashboard's Hosted Button generator. The client-id is a
// public identifier (not a secret) — safe to ship in client code.
const PAYPAL_CLIENT_ID =
  "BAAykdPM-4dViYfY6L3MRr3_te25rObRRG8MnWp70CQsod-PQXL436AhcLATfi7Nu3bGdgSyupJN5lLpnw";
const PAYPAL_HOSTED_BUTTON_ID = "LPDTYCGELPYHL";

const PAYPAL_BUTTON_HTML = `
<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      body { margin: 0; padding: 24px 16px; display: flex; justify-content: center; font-family: -apple-system, sans-serif; }
    </style>
  </head>
  <body>
    <div id="paypal-container-${PAYPAL_HOSTED_BUTTON_ID}"></div>
    <script src="https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&components=hosted-buttons&disable-funding=venmo&currency=AUD"></script>
    <script>
      window.addEventListener("load", function () {
        paypal.HostedButtons({
          hostedButtonId: "${PAYPAL_HOSTED_BUTTON_ID}",
        }).render("#paypal-container-${PAYPAL_HOSTED_BUTTON_ID}");
      });
    </script>
  </body>
</html>
`;

export default function SubscribeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const statusQuery = trpc.subscriptions.getStatus.useQuery(undefined, {
    enabled: !!user,
  });

  const markPaid = trpc.subscriptions.markPaid.useMutation({
    onSuccess: () => {
      setCheckoutOpen(false);
      statusQuery.refetch();
      Alert.alert("You're unlocked!", "Thanks for supporting Outdoor Hounds.");
    },
    onError: (err) => Alert.alert("Couldn't update your status", err.message),
  });

  const isActive = statusQuery.data?.active ?? false;

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
            onPress={() => setCheckoutOpen(true)}
            className="bg-primary rounded-lg py-3 items-center active:opacity-70"
          >
            <Text className="text-background font-semibold">
              Unlock for {UNLOCK_PRICE_LABEL} via PayPal
            </Text>
          </Pressable>
        )}

        {isActive && (
          <Pressable onPress={() => router.back()} className="items-center py-2">
            <Text className="text-sm text-muted">Back</Text>
          </Pressable>
        )}
      </View>

      <Modal
        visible={checkoutOpen}
        animationType="slide"
        onRequestClose={() => setCheckoutOpen(false)}
      >
        <ScreenContainer className="p-0">
          <View className="flex-1">
            <WebView source={{ html: PAYPAL_BUTTON_HTML }} className="flex-1" />

            <View className="px-6 py-4 gap-3 border-t border-border bg-background">
              <Text className="text-xs text-muted text-center">
                Complete your payment above, then confirm below. This isn&apos;t
                automatically verified, so only confirm once PayPal shows your
                payment is complete.
              </Text>
              <Pressable
                onPress={() => markPaid.mutate()}
                disabled={markPaid.isPending}
                className="bg-primary rounded-lg py-3 items-center active:opacity-70 disabled:opacity-50"
              >
                {markPaid.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-background font-semibold">
                    I&apos;ve completed payment
                  </Text>
                )}
              </Pressable>
              <Pressable
                onPress={() => setCheckoutOpen(false)}
                className="items-center py-2"
              >
                <Text className="text-sm text-muted">Cancel</Text>
              </Pressable>
            </View>
          </View>
        </ScreenContainer>
      </Modal>
    </ScreenContainer>
  );
}
