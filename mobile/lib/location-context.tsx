import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import * as ExpoLocation from "expo-location";

type LocationState = {
  lat: number | null;
  lng: number | null;
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
  lat: null, lng: null, radiusKm: 25, enabled: false,
  loading: false, error: null,
  setRadius: () => {}, requestLocation: async () => {}, disable: () => {},
});

export function LocationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LocationState>({
    lat: null, lng: null, radiusKm: 25, enabled: false, loading: false, error: null,
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
      setState(s => ({ ...s, lat: pos.coords.latitude, lng: pos.coords.longitude, enabled: true, loading: false }));
    } catch (e) {
      setState(s => ({ ...s, loading: false, error: "Could not get your location." }));
    }
  }, []);

  const setRadius = useCallback((km: number) => {
    setState(s => ({ ...s, radiusKm: km }));
  }, []);

  const disable = useCallback(() => {
    setState(s => ({ ...s, lat: null, lng: null, enabled: false }));
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
