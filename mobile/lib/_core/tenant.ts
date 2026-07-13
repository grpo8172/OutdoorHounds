import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// Public, non-sensitive — mirrors device-id.ts's storage pattern, not
// auth.ts's SecureStore (which is reserved for actual credentials).
const TENANT_SLUG_KEY = "outdoor-hounds-tenant-slug";

export async function getTenantSlug(): Promise<string | null> {
  if (Platform.OS === "web") {
    return typeof window === "undefined" ? null : window.localStorage.getItem(TENANT_SLUG_KEY);
  }
  return AsyncStorage.getItem(TENANT_SLUG_KEY);
}

export async function setTenantSlug(slug: string): Promise<void> {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") window.localStorage.setItem(TENANT_SLUG_KEY, slug);
    return;
  }
  await AsyncStorage.setItem(TENANT_SLUG_KEY, slug);
}

export async function clearTenantSlug(): Promise<void> {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") window.localStorage.removeItem(TENANT_SLUG_KEY);
    return;
  }
  await AsyncStorage.removeItem(TENANT_SLUG_KEY);
}
