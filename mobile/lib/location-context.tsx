import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import * as ExpoLocation from "expo-location";

type LocationState = {
  lat: number | null;
  lng: number | null;
  placeName: string | null;
  radiusKm: number;
  enabled: boolean;
  loading: boolean;
  error: string | null;
};

type LocationContextValue = LocationState & {
  setRadius: (km: number) => void;
  requestLocation: () => Promise<void>;
  disable: () => void;
};

const LocationContext = createContext<LocationContextValue>({
  lat: null, lng: null, placeName: null, radiusKm: 25, enabled: false,
  loading: false, error: null,
  setRadius: () => {}, requestLocation: async () => {}, disable: () => {},
});

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
    const res = await fetch(url, { headers: { "User-Agent": "OutdoorHoundsApp/1.0" } });
    const data = await res.json() as { address?: Record<string, string> };
    const a = data.address ?? {};
    // Pick the most readable locality name available
    const name = a.suburb ?? a.neighbourhood ?? a.village ?? a.town ?? a.city_district ?? a.city ?? a.county ?? a.state;
    return name ?? "Your location";
  } catch {
    return "Your location";
  }
}

export function LocationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LocationState>({
    lat: null, lng: null, placeName: null, radiusKm: 25, enabled: false, loading: false, error: null,
  });

  const requestLocation = useCallback(async () => {
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setState(s => ({ ...s, loading: false, error: "Location permission denied." }));
        return;
      }
      const pos = await ExpoLocation.getCurrentPositionAsync({ accuracy: ExpoLocation.Accuracy.Balanced });
      const { latitude: lat, longitude: lng } = pos.coords;
      const placeName = await reverseGeocode(lat, lng);
      setState(s => ({ ...s, lat, lng, placeName, enabled: true, loading: false }));
    } catch {
      setState(s => ({ ...s, loading: false, error: "Could not get your location." }));
    }
  }, []);

  const setRadius = useCallback((km: number) => {
    setState(s => ({ ...s, radiusKm: km }));
  }, []);

  const disable = useCallback(() => {
    setState(s => ({ ...s, lat: null, lng: null, placeName: null, enabled: false }));
  }, []);

  return (
    <LocationContext.Provider value={{ ...state, setRadius, requestLocation, disable }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  return useContext(LocationContext);
}
