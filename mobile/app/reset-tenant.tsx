import { useEffect } from "react";
import { ActivityIndicator, Text } from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import * as Tenant from "@/lib/_core/tenant";

// Counterpart to /t/[slug] for the platform's own default tenant, which has
// no slug of its own to deep-link to. Without this, opening the bare app
// URL leaves whatever tenant was last joined on THIS device untouched (see
// use-active-tenant.ts) — so a link meant to land someone on the default
// tenant could silently keep showing a different community they'd joined
// earlier. This route explicitly clears that persisted state first.
export default function ResetTenantScreen() {
  useEffect(() => {
    Tenant.clearTenantSlug().then(() => router.replace("/(tabs)"));
  }, []);

  return (
    <ScreenContainer className="items-center justify-center gap-3">
      <ActivityIndicator size="large" />
      <Text className="text-sm text-muted">Loading...</Text>
    </ScreenContainer>
  );
}
