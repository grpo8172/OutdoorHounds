import * as Linking from "expo-linking";
import * as ReactNative from "react-native";
import { showAlert } from "@/lib/alert";

// Extract scheme from bundle ID (last segment timestamp, prefixed with "manus")
// e.g., "space.manus.my.app.t20240115103045" -> "manus20240115103045"
const bundleId = "com.app.outdoorhoundsmobile";
const timestamp = bundleId.split(".").pop()?.replace(/^t/, "") ?? "";
const schemeFromBundleId = `manus${timestamp}`;

const env = {
  googleClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? "",
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? "",
  deepLinkScheme: schemeFromBundleId,
};

export const DEEP_LINK_SCHEME = env.deepLinkScheme;
export const API_BASE_URL = env.apiBaseUrl;

/**
 * Get the API base URL.
 * On web, returns "" (relative URL) so nginx proxies /api requests to the API
 * server same-origin — this is required for auth cookies to work without HTTPS.
 */
export function getApiBaseUrl(): string {
  if (API_BASE_URL) {
    return API_BASE_URL.replace(/\/$/, "");
  }
  return "";
}

export const SESSION_TOKEN_KEY = "app_session_token";
export const USER_INFO_KEY = "manus-runtime-user-info";

const encodeState = (value: string) => {
  if (typeof globalThis.btoa === "function") {
    return globalThis.btoa(value);
  }
  const BufferImpl = (globalThis as Record<string, any>).Buffer;
  if (BufferImpl) {
    return BufferImpl.from(value, "utf-8").toString("base64");
  }
  return value;
};

/**
 * Where Google should send the browser/app back to after the user approves
 * or cancels sign-in. This travels inside `state`, not as the OAuth
 * redirect_uri (Google's redirect_uri is always the fixed server callback —
 * see getGoogleAuthUrl below).
 */
function getReturnTo(): string {
  if (ReactNative.Platform.OS === "web") {
    return typeof window !== "undefined" ? window.location.origin : "";
  }
  return Linking.createURL("/oauth/callback", {
    scheme: env.deepLinkScheme,
  });
}

export const getGoogleAuthUrl = () => {
  const platform = ReactNative.Platform.OS === "web" ? "web" : "native";
  const state = encodeState(JSON.stringify({ returnTo: getReturnTo(), platform }));

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", env.googleClientId);
  url.searchParams.set("redirect_uri", `${getApiBaseUrl()}/api/oauth/google/callback`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");

  return url.toString();
};

/**
 * Start OAuth login flow.
 *
 * On native platforms (iOS/Android), open the system browser directly so
 * the OAuth callback returns via deep link to the app.
 *
 * On web, this simply redirects to the login URL.
 *
 * @returns Always null, the callback is handled via deep link.
 */
export async function startOAuthLogin(): Promise<string | null> {
  if (!env.googleClientId) {
    if (__DEV__) {
      console.warn("[OAuth] EXPO_PUBLIC_GOOGLE_CLIENT_ID is not set — OAuth will fail");
      console.log("[OAuth] API base URL:", getApiBaseUrl() || "(empty — relative URL will be used)");
    }
    showAlert(
      "Sign-in not configured",
      "Google Sign-In isn't set up in this environment. Use 'Continue as test user' to sign in for testing.",
    );
    return null;
  }

  const loginUrl = getGoogleAuthUrl();

  if (__DEV__) {
    console.log("[OAuth] startOAuthLogin:", { loginUrl, apiBaseUrl: getApiBaseUrl() });
  }

  if (ReactNative.Platform.OS === "web") {
    // On web, just redirect
    if (typeof window !== "undefined") {
      window.location.href = loginUrl;
    }
    return null;
  }

  const supported = await Linking.canOpenURL(loginUrl);
  if (!supported) {
    console.warn("[OAuth] Cannot open login URL: URL scheme not supported");
    return null;
  }

  try {
    await Linking.openURL(loginUrl);
  } catch (error) {
    console.error("[OAuth] Failed to open login URL:", error);
  }

  // The OAuth callback will reopen the app via deep link.
  return null;
}
