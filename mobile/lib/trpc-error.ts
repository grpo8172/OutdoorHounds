import { PAYWALL_ERR_MSG, GUEST_LIMIT_ERR_MSG, DAILY_CAP_ERR_MSG, TENANT_NOT_FOUND_ERR_MSG } from "@shared/const";

export function isPaywallError(err: { message?: string }): boolean {
  return err?.message === PAYWALL_ERR_MSG;
}

export function isGuestLimitError(err: { message?: string }): boolean {
  return err?.message === GUEST_LIMIT_ERR_MSG;
}

export function isDailyCapError(err: { message?: string }): boolean {
  return err?.message === DAILY_CAP_ERR_MSG;
}

export function isTenantNotFoundError(err: { message?: string }): boolean {
  return err?.message === TENANT_NOT_FOUND_ERR_MSG;
}
