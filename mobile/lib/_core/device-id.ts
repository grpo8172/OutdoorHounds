import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const DEVICE_ID_KEY = "outdoor-hounds-device-id";

function generateId(): string {
  // Rate-limit anchor for anonymous guests, not a security credential —
  // Math.random-based entropy is fine here.
  const rand = () => Math.random().toString(16).slice(2);
  return `${Date.now().toString(16)}-${rand()}-${rand()}`;
}

export async function getOrCreateDeviceId(): Promise<string> {
  if (Platform.OS === "web") {
    if (typeof window === "undefined") return generateId();
    const existing = window.localStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;
    const id = generateId();
    window.localStorage.setItem(DEVICE_ID_KEY, id);
    return id;
  }

  const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;
  const id = generateId();
  await AsyncStorage.setItem(DEVICE_ID_KEY, id);
  return id;
}
