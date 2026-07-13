import { useEffect, useState } from "react";
import { ActivityIndicator, Text } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import * as Tenant from "@/lib/_core/tenant";
import { showAlert } from "@/lib/alert";

// Mirrors the web business site's /t/:slug — a shareable link an admin
// hands out to "her people." Persists the slug locally so every subsequent
// tRPC call (see lib/trpc.ts) carries it as the X-Tenant-Slug header, then
// drops the customer into the normal discover/interactions flow scoped to
// that community.
export default function JoinTenantScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!slug) return;
    Tenant.setTenantSlug(slug).then(() => setReady(true));
  }, [slug]);

  const query = trpc.tenant.getActive.useQuery(undefined, { enabled: ready, retry: false });

  useEffect(() => {
    if (query.isSuccess) {
      router.replace("/(tabs)");
    }
  }, [query.isSuccess]);

  useEffect(() => {
    if (query.error) {
      Tenant.clearTenantSlug().then(() => {
        showAlert("Community not found", "This link isn't valid anymore.");
        router.replace("/(tabs)");
      });
    }
  }, [query.error]);

  return (
    <ScreenContainer className="items-center justify-center gap-3">
      <ActivityIndicator size="large" />
      <Text className="text-sm text-muted">Joining community...</Text>
    </ScreenContainer>
  );
}
