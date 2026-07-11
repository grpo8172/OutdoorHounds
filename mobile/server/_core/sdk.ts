import { COOKIE_NAME, ONE_YEAR_MS } from "../../shared/const.js";
import { ForbiddenError } from "../../shared/_core/errors.js";
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { SignJWT, jwtVerify, decodeJwt } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";

// Utility function
const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

export type SessionPayload = {
  openId: string;
  appId: string;
  name: string;
};

type GoogleIdTokenClaims = {
  sub: string;
  email?: string;
  name?: string;
};

/**
 * Exchange a Google OAuth authorization code for the signed-in user's
 * identity. We call Google's token endpoint ourselves, server-to-server,
 * authenticated with our client_secret — so decoding the returned id_token
 * without re-verifying it against Google's JWKS is a deliberate tradeoff,
 * not an oversight: Google is vouching for the token directly to us, there's
 * no untrusted third party in this path for a signature check to protect
 * against. (This would no longer hold if a client-side/PKCE flow were added.)
 */
export async function exchangeGoogleCode(
  code: string,
  redirectUri: string,
): Promise<{ openId: string; email: string | null; name: string | null }> {
  const { data } = await axios.post<{ id_token: string }>(
    "https://oauth2.googleapis.com/token",
    {
      code,
      client_id: ENV.googleClientId,
      client_secret: ENV.googleClientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    },
  );

  const claims = decodeJwt(data.id_token) as GoogleIdTokenClaims;
  return {
    openId: claims.sub,
    email: claims.email ?? null,
    name: claims.name ?? null,
  };
}

class SDKServer {
  private parseCookies(cookieHeader: string | undefined) {
    if (!cookieHeader) {
      return new Map<string, string>();
    }

    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }

  private getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }

  /**
   * Create a session token for a signed-in user's openId (the Google `sub`).
   * @example
   * const sessionToken = await sdk.createSessionToken(openId, { name });
   */
  async createSessionToken(
    openId: string,
    options: { expiresInMs?: number; name?: string } = {},
  ): Promise<string> {
    return this.signSession(
      {
        openId,
        appId: ENV.googleClientId || "local-dev",
        name: options.name || "",
      },
      options,
    );
  }

  async signSession(
    payload: SessionPayload,
    options: { expiresInMs?: number } = {},
  ): Promise<string> {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1000);
    const secretKey = this.getSessionSecret();

    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name,
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(expirationSeconds)
      .sign(secretKey);
  }

  async verifySession(
    cookieValue: string | undefined | null,
  ): Promise<{ openId: string; appId: string; name: string } | null> {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }

    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"],
      });
      const { openId, appId, name } = payload as Record<string, unknown>;

      if (!isNonEmptyString(openId)) {
        console.warn("[Auth] Session payload missing openId");
        return null;
      }

      return {
        openId,
        appId: isNonEmptyString(appId) ? appId : "",
        name: isNonEmptyString(name) ? name : "",
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }

  async authenticateRequest(req: Request): Promise<User> {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    let token: string | undefined;
    if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
      token = authHeader.slice("Bearer ".length).trim();
    }

    const cookies = this.parseCookies(req.headers.cookie);
    const sessionCookie = token || cookies.get(COOKIE_NAME);
    const session = await this.verifySession(sessionCookie);

    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }

    const user = await db.getUserByOpenId(session.openId);

    if (!user) {
      throw ForbiddenError("User not found");
    }

    await db.upsertUser({
      openId: user.openId,
      lastSignedIn: new Date(),
    });

    return user;
  }
}

export const sdk = new SDKServer();

// Thin wrapper so callers outside this class can verify a raw JWT string.
sdk.verifySessionToken = (token: string) => (sdk as any).verifySession(token);
