import type { CookieOptions, Request } from "express";

function isSecureRequest(req: Request) {
  if (req.protocol === "https") return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");

  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}

// The web app calls the API cross-origin (mobile-web-*.run.app fetching
// mobile-api-*.run.app — there is no same-origin nginx proxy in front of
// /api), so the session cookie must be sendable on cross-site fetch/XHR
// requests. SameSite=Lax blocks that (it only allows top-level navigations),
// which silently broke every write action for every user: the cookie got
// set fine but never came back on the next request, so ctx.user was always
// null. SameSite=None requires Secure=true or browsers reject the cookie
// outright — Cloud Run's HTTPS-only prod traffic satisfies that, so fall
// back to Lax only for local/non-HTTPS dev where isSecureRequest() is false.
export function getSessionCookieOptions(
  req: Request,
): Pick<CookieOptions, "httpOnly" | "path" | "sameSite" | "secure"> {
  const secure = isSecureRequest(req);
  return {
    httpOnly: true,
    path: "/",
    sameSite: secure ? "none" : "lax",
    secure,
  };
}
