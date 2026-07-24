export const COOKIE_NAME = "app_session_id";
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = "Please login (10001)";
export const NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

// One-time payment that unlocks creating listings. Single source of truth —
// used by both the client (display copy) and server (amount recorded on payment).
export const UNLOCK_PRICE_CENTS = 1000;
export const UNLOCK_PRICE_LABEL = `$${UNLOCK_PRICE_CENTS / 100}`;

export const ADMIN_UNLOCK_PRICE_CENTS = 6000;
export const ADMIN_UNLOCK_PRICE_LABEL = `$${ADMIN_UNLOCK_PRICE_CENTS / 100}`;

export const PAYWALL_ERR_MSG = "Unlock Outdoor Hounds to continue (10003)";
export const GUEST_LIMIT_ERR_MSG = "Daily guest limit reached — sign in to continue (10004)";
export const DAILY_CAP_ERR_MSG = `Daily limit reached — pay ${UNLOCK_PRICE_LABEL} for 40 more today (10005)`;
export const TENANT_NOT_FOUND_ERR_MSG = "Community not found (10006)";
