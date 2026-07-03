import { COOKIE_NAME, ONE_YEAR_MS } from "../../shared/const.js";
import type { Express, Request, Response } from "express";
import { getUserByOpenId, upsertUser, getOrCreateProfile } from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk, exchangeGoogleCode } from "./sdk";
import { ENV } from "./env";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

type OAuthState = { returnTo: string; platform: "web" | "native" };

function decodeState(state: string): OAuthState {
  const decoded = JSON.parse(Buffer.from(state, "base64").toString("utf-8"));
  if (!decoded?.returnTo || !decoded?.platform) {
    throw new Error("Invalid state payload");
  }
  return decoded;
}

async function syncUser(userInfo: {
  openId?: string | null;
  name?: string | null;
  email?: string | null;
  loginMethod?: string | null;
  platform?: string | null;
}) {
  if (!userInfo.openId) {
    throw new Error("openId missing from user info");
  }

  const lastSignedIn = new Date();
  await upsertUser({
    openId: userInfo.openId,
    name: userInfo.name || null,
    email: userInfo.email ?? null,
    loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
    lastSignedIn,
  });
  const saved = await getUserByOpenId(userInfo.openId);

  if (saved?.id) {
    await getOrCreateProfile(saved.id, {
      displayName: userInfo.name ?? null,
      contactEmail: userInfo.email ?? null,
    });
  }

  return (
    saved ?? {
      openId: userInfo.openId,
      name: userInfo.name,
      email: userInfo.email,
      loginMethod: userInfo.loginMethod ?? null,
      lastSignedIn,
    }
  );
}

function buildUserResponse(
  user:
    | Awaited<ReturnType<typeof getUserByOpenId>>
    | {
        openId: string;
        name?: string | null;
        email?: string | null;
        loginMethod?: string | null;
        lastSignedIn?: Date | null;
      },
) {
  return {
    id: (user as any)?.id ?? null,
    openId: user?.openId ?? null,
    name: user?.name ?? null,
    email: user?.email ?? null,
    loginMethod: user?.loginMethod ?? null,
    lastSignedIn: (user?.lastSignedIn ?? new Date()).toISOString(),
  };
}

export function registerOAuthRoutes(app: Express) {
  // Single HTTPS callback for both web and native. Google's "Web
  // application" OAuth client type only accepts http(s) redirect URIs, not
  // custom URL schemes, so the actual per-platform destination (a web URL or
  // a native deep link) travels inside `state`, never as the OAuth
  // redirect_uri itself.
  app.get("/api/oauth/google/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    const oauthError = getQueryParam(req, "error");

    if (!state) {
      res.status(400).json({ error: "state is required" });
      return;
    }

    let returnTo: string;
    let platform: OAuthState["platform"];
    try {
      ({ returnTo, platform } = decodeState(state));
    } catch {
      res.status(400).json({ error: "Invalid state parameter" });
      return;
    }

    if (oauthError || !code) {
      res.redirect(302, `${returnTo}?error=${encodeURIComponent(oauthError || "missing_code")}`);
      return;
    }

    try {
      const google = await exchangeGoogleCode(code, ENV.googleRedirectUri);
      const user = await syncUser({
        openId: google.openId,
        name: google.name,
        email: google.email,
        loginMethod: "google",
      });

      const sessionToken = await sdk.createSessionToken(google.openId, {
        name: google.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      if (platform === "web") {
        const cookieOptions = getSessionCookieOptions(req);
        res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        res.redirect(302, returnTo);
        return;
      }

      const userParam = Buffer.from(JSON.stringify(buildUserResponse(user))).toString("base64");
      res.redirect(
        302,
        `${returnTo}?sessionToken=${encodeURIComponent(sessionToken)}&user=${encodeURIComponent(userParam)}`,
      );
    } catch (error) {
      console.error("[OAuth] Google callback failed", error);
      res.redirect(302, `${returnTo}?error=${encodeURIComponent("oauth_failed")}`);
    }
  });

  // Dev-only shortcut to test signed-in flows without a working OAuth
  // provider configured. Mints a real session for a fixed test account —
  // hard-blocked in production so it can never ship as a login bypass.
  // Remove once Google OAuth is live on the real deployment target.
  app.post("/api/auth/dev-login", async (req: Request, res: Response) => {
    if (ENV.isProduction) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const DEV_OPEN_ID = "dev-test-user";
    const user = await syncUser({
      openId: DEV_OPEN_ID,
      name: "Test User",
      email: "test-user@example.local",
      loginMethod: "dev",
    });

    const sessionToken = await sdk.createSessionToken(DEV_OPEN_ID, { name: "Test User" });

    const cookieOptions = getSessionCookieOptions(req);
    res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

    res.json({ success: true, sessionToken, user: buildUserResponse(user) });
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    res.json({ success: true });
  });

  // Get current authenticated user - works with both cookie (web) and Bearer token (mobile)
  app.get("/api/auth/me", async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticateRequest(req);
      res.json({ user: buildUserResponse(user) });
    } catch (error) {
      console.error("[Auth] /api/auth/me failed:", error);
      res.status(401).json({ error: "Not authenticated", user: null });
    }
  });

  // Establish session cookie from Bearer token
  // Used by iframe preview: frontend receives token via postMessage, then calls this endpoint
  // to get a proper Set-Cookie response from the backend (3000-xxx domain)
  app.post("/api/auth/session", async (req: Request, res: Response) => {
    try {
      // Authenticate using Bearer token from Authorization header
      const user = await sdk.authenticateRequest(req);

      // Get the token from the Authorization header to set as cookie
      const authHeader = req.headers.authorization || req.headers.Authorization;
      if (typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
        res.status(400).json({ error: "Bearer token required" });
        return;
      }
      const token = authHeader.slice("Bearer ".length).trim();

      // Set cookie for this domain (3000-xxx)
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.json({ success: true, user: buildUserResponse(user) });
    } catch (error) {
      console.error("[Auth] /api/auth/session failed:", error);
      res.status(401).json({ error: "Invalid token" });
    }
  });
}
