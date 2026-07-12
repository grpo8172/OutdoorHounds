export const ENV = {
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  paypalClientId: process.env.PAYPAL_CLIENT_ID ?? "",
  paypalClientSecret: process.env.PAYPAL_CLIENT_SECRET ?? "",
  paypalApiBase: process.env.PAYPAL_API_BASE ?? "https://api-m.sandbox.paypal.com",
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI ?? "",
  // Web login now redirects through mobile-web's own domain (proxied to this
  // service by nginx) rather than mobile-api's domain directly, so the
  // browser never sees a cross-site cookie — required for Safari's ITP to
  // accept the session cookie. Native is unaffected (token-in-URL, no cookie).
  googleRedirectUriWeb: process.env.GOOGLE_REDIRECT_URI_WEB ?? "",
};
