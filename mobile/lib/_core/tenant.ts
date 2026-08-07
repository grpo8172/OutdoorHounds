import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// Public, non-sensitive — mirrors device-id.ts's storage pattern, not
// auth.ts's SecureStore (which is reserved for actual credentials).
const TENANT_SLUG_KEY = "outdoor-hounds-tenant-slug";

// Written by clearTenantSlug() instead of removing the key outright, so
// "explicitly left" stays distinguishable from "never made a tenant
// decision" for any future caller that cares about the difference — both
// currently just resolve to the default tenant either way.
const NONE_MARKER = "__none__";

async function readRaw(): Promise<string | null> {
  if (Platform.OS === "web") {
    return typeof window === "undefined" ? null : window.localStorage.getItem(TENANT_SLUG_KEY);
  }
  return AsyncStorage.getItem(TENANT_SLUG_KEY);
}

export async function getTenantSlug(): Promise<string | null> {
  const raw = await readRaw();
  return raw === null || raw === NONE_MARKER ? null : raw;
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
    if (typeof window !== "undefined") window.localStorage.setItem(TENANT_SLUG_KEY, NONE_MARKER);
    return;
  }
  await AsyncStorage.setItem(TENANT_SLUG_KEY, NONE_MARKER);
}
