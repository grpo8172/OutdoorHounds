import * as Linking from "expo-linking";
import * as ReactNative from "react-native";
import { DEEP_LINK_SCHEME } from "./oauth";

/**
 * Where PayPal should redirect back to after the user approves or cancels
 * checkout. On native this is a deep link the OS hands back to the app; on
 * web it's the current page (query params are read on mount).
 */
export function getPaypalRedirectUri(status: "success" | "cancel"): string {
  if (ReactNative.Platform.OS === "web") {
    if (typeof window === "undefined") return "";
    const url = new URL(window.location.href);
    url.search = "";
    url.searchParams.set("paypalStatus", status);
    return url.toString();
  }

  return Linking.createURL("/paypal/callback", {
    scheme: DEEP_LINK_SCHEME,
    queryParams: { paypalStatus: status },
  });
}
