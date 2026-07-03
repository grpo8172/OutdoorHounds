import type { CookieOptions, Request } from "express";

function isSecureRequest(req: Request) {
  if (req.protocol === "https") return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");

  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}

// nginx proxies /api through the same origin as the web app (see nginx.conf),
// so the session cookie is always first-party — no cross-subdomain domain
// sharing or SameSite=None needed. That combination also silently breaks
// behind proxies that don't forward X-Forwarded-Proto (e.g. Cloud Shell's
// preview tunnel): browsers reject SameSite=None cookies that aren't Secure,
// and isSecureRequest() can't detect HTTPS without that header.
export function getSessionCookieOptions(
  req: Request,
): Pick<CookieOptions, "httpOnly" | "path" | "sameSite" | "secure"> {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: isSecureRequest(req),
  };
}
