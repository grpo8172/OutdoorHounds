export const COOKIE_NAME = "app_session_id";
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = "Please login (10001)";
export const NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

// One-time payment that unlocks creating listings. Single source of truth —
// used by both the client (display copy) and server (amount recorded on payment).
export const UNLOCK_PRICE_CENTS = 1000;
export const UNLOCK_PRICE_LABEL = `$${UNLOCK_PRICE_CENTS / 100}`;

export const ADMIN_UNLOCK_PRICE_CENTS = 3000;
export const ADMIN_UNLOCK_PRICE_LABEL = `$${ADMIN_UNLOCK_PRICE_CENTS / 100}`;
