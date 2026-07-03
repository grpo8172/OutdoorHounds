import { Alert, Platform } from "react-native";

// react-native-web's Alert.alert is a no-op (see node_modules/react-native-web/src/exports/Alert),
// so errors surfaced through it are silently swallowed on the web build. Route through window.alert there instead.
export function showAlert(title: string, message?: string) {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") {
      window.alert(message ? `${title}\n\n${message}` : title);
    }
    return;
  }
  Alert.alert(title, message);
}
