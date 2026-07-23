import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// Public, non-sensitive — mirrors device-id.ts's storage pattern, not
// auth.ts's SecureStore (which is reserved for actual credentials).
const TENANT_SLUG_KEY = "outdoor-hounds-tenant-slug";

// Written by clearTenantSlug() instead of removing the key outright. Plain
// removal would make "explicitly left" indistinguishable from "this device
// has never made a tenant decision at all" — both read back as null — which
// caused leave() to get silently undone: useActiveTenant's owned-tenant
// auto-join treated a fresh clear as "never decided" and immediately
// rejoined the signed-in owner's own site on the next render/refresh.
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

// True once this device has ever recorded a tenant decision — joined one
// (setTenantSlug) or explicitly left one (clearTenantSlug). False only for
// a device that has never touched tenant state at all. See useActiveTenant:
// the owned-tenant auto-join is gated on this being false, so it fires at
// most once per device, ever — never re-overriding a later "leave" or a
// visit to someone else's tenant.
export async function hasMadeTenantChoice(): Promise<boolean> {
  const raw = await readRaw();
  return raw !== null;
}
