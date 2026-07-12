import * as Api from "@/lib/_core/api";
import * as Auth from "@/lib/_core/auth";
import { getOrCreateDeviceId } from "@/lib/_core/device-id";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Platform } from "react-native";

type AuthContextValue = {
  user: Auth.User | null;
  loading: boolean;
  error: Error | null;
  isAuthenticated: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  devLogin: () => Promise<void>;
  guestLogin: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Auth.User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUser = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Web platform: use cookie-based auth, fetch user from API
      if (Platform.OS === "web") {
        const apiUser = await Api.getMe();

        if (apiUser) {
          const userInfo: Auth.User = {
            id: apiUser.id,
            openId: apiUser.openId,
            name: apiUser.name,
            email: apiUser.email,
            loginMethod: apiUser.loginMethod,
            lastSignedIn: new Date(apiUser.lastSignedIn),
          };
          setUser(userInfo);
          // Cache user info in localStorage for faster subsequent loads
          await Auth.setUserInfo(userInfo);
        } else {
          setUser(null);
          await Auth.clearUserInfo();
        }
        return;
      }

      // Native platform: use token-based auth
      const sessionToken = await Auth.getSessionToken();
      if (!sessionToken) {
        setUser(null);
        return;
      }

      // Use cached user info for native (token validates the session)
      const cachedUser = await Auth.getUserInfo();
      setUser(cachedUser ?? null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to fetch user");
      console.error("[AuthProvider] fetchUser error:", error);
      setError(error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Dev-only: sign in as a fixed test user without a working OAuth provider.
  // Server hard-blocks the underlying endpoint in production.
  const devLogin = useCallback(async () => {
    const result = await Api.devLogin();
    if (Platform.OS !== "web") {
      await Auth.setSessionToken(result.sessionToken);
    }
    const userInfo: Auth.User = {
      id: result.user.id,
      openId: result.user.openId,
      name: result.user.name,
      email: result.user.email,
      loginMethod: result.user.loginMethod,
      lastSignedIn: new Date(result.user.lastSignedIn),
    };
    await Auth.setUserInfo(userInfo);
    setUser(userInfo);
  }, []);

  // Production-safe anonymous trial: mints a real session tied to a
  // device-persisted id, so repeat visits on the same device resolve back
  // to the same guest user (and therefore the same daily rate-limit counter).
  const guestLogin = useCallback(async () => {
    const deviceId = await getOrCreateDeviceId();
    const result = await Api.guestLogin(deviceId);
    if (Platform.OS !== "web") {
      await Auth.setSessionToken(result.sessionToken);
    }
    const userInfo: Auth.User = {
      id: result.user.id,
      openId: result.user.openId,
      name: result.user.name,
      email: result.user.email,
      loginMethod: result.user.loginMethod,
      lastSignedIn: new Date(result.user.lastSignedIn),
    };
    await Auth.setUserInfo(userInfo);
    setUser(userInfo);
  }, []);

  const logout = useCallback(async () => {
    try {
      await Api.logout();
    } catch (err) {
      console.error("[Auth] Logout API call failed:", err);
      // Continue with logout even if API call fails
    } finally {
      await Auth.removeSessionToken();
      await Auth.clearUserInfo();
      setUser(null);
      setError(null);
    }
  }, []);

  const isAuthenticated = useMemo(() => Boolean(user), [user]);

  useEffect(() => {
    if (Platform.OS === "web") {
      // Web: fetch user from API directly (user will login manually if needed)
      fetchUser();
    } else {
      // Native: check for cached user info first for faster initial load
      Auth.getUserInfo().then((cachedUser) => {
        if (cachedUser) {
          setUser(cachedUser);
          setLoading(false);
        } else {
          // No cached user, check session token
          fetchUser();
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      error,
      isAuthenticated,
      refresh: fetchUser,
      logout,
      devLogin,
      guestLogin,
    }),
    [user, loading, error, isAuthenticated, fetchUser, logout, devLogin, guestLogin],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
