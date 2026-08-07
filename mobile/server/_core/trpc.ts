import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG, PAYWALL_ERR_MSG, GUEST_LIMIT_ERR_MSG, DAILY_CAP_ERR_MSG, TENANT_NOT_FOUND_ERR_MSG } from "../../shared/const.js";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { User } from "../../drizzle/schema";
import type { TrpcContext } from "./context";
import { ENV } from "./env";
import {
  hasActiveSubscription,
  hasActiveAdminSubscription,
  consumeWriteQuota,
  resolveTenantId,
  GUEST_DAILY_WRITE_LIMIT,
  PAID_DAILY_WRITE_LIMIT,
} from "../db";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

// Tiered write-action gate, keyed purely off the user (tenant-blind):
//   - guest (no login):        GUEST_DAILY_WRITE_LIMIT/day, then must sign in
//   - $1 base unlock:          PAID_DAILY_WRITE_LIMIT/day, then another $1
//                               payment tops up +PAID_DAILY_WRITE_LIMIT for
//                               the rest of the day (see topUpDailyWriteQuota,
//                               wired into subscriptions.captureOrder)
//   - $5 admin unlock:         uncapped — a trusted, elevated tier
// Extracted so items.submit can call it conditionally (skipped for a
// tenant's free-listings adopt/foster exemption) while every other write
// mutation keeps going through writeProcedure below unchanged.
export async function enforceWritePaywall(user: User): Promise<void> {
  if (!ENV.isProduction) return;

  if (user.loginMethod === "guest") {
    const allowed = await consumeWriteQuota(user.id, GUEST_DAILY_WRITE_LIMIT);
    if (!allowed) {
      throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: GUEST_LIMIT_ERR_MSG });
    }
    return;
  }

  if (await hasActiveAdminSubscription(user.id)) return;

  const unlocked = await hasActiveSubscription(user.id);
  if (!unlocked) {
    throw new TRPCError({ code: "FORBIDDEN", message: PAYWALL_ERR_MSG });
  }

  const allowed = await consumeWriteQuota(user.id, PAID_DAILY_WRITE_LIMIT);
  if (!allowed) {
    throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: DAILY_CAP_ERR_MSG });
  }
}

// Like enforceWritePaywall, but without the guest carve-out — used only for
// listing submissions outside a tenant's free-listings waiver. The small
// guest quota above exists for lower-stakes actions (saving a listing,
// messaging), not as a backdoor around the $10/$60 unlock for posting a
// paid-category listing — a guest posting there should hit the same
// paywall as any other signed-in-but-unpaid user, not a free daily
// allowance. See items.ts's submit mutation.
export async function enforceListingPaywall(user: User): Promise<void> {
  if (!ENV.isProduction) return;

  if (await hasActiveAdminSubscription(user.id)) return;

  const unlocked = await hasActiveSubscription(user.id);
  if (!unlocked) {
    throw new TRPCError({ code: "FORBIDDEN", message: PAYWALL_ERR_MSG });
  }

  const allowed = await consumeWriteQuota(user.id, PAID_DAILY_WRITE_LIMIT);
  if (!allowed) {
    throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: DAILY_CAP_ERR_MSG });
  }
}

// Payment endpoints themselves (subscriptions router) must NOT use this —
// you can't require having already paid in order to pay.
export const writeProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;

    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    }

    await enforceWritePaywall(ctx.user);

    return next({ ctx: { ...ctx, user: ctx.user } });
  }),
);

export const adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

// Resolves ctx.tenantSlug (raw, unresolved) to a concrete tenantId. Absent
// slug ⇒ the default tenant, zero extra query. A present-but-unmatched slug
// is a hard error, never a silent fallback — mirrors the web business
// site's _resolve_tenant semantics exactly.
//
// Applied via an inline `.use(async ({ ctx, next }) => ...)` on each base
// procedure below (rather than a single shared `t.middleware(...)` object)
// so TypeScript infers `ctx` from that specific builder's already-narrowed
// context — a standalone middleware typed against the generic TrpcContext
// would otherwise widen `ctx.user` back to `User | null` on
// protectedProcedure/writeProcedure, undoing requireUser's narrowing.
async function resolveTenantOrThrow(tenantSlug: string | null): Promise<number> {
  const tenantId = await resolveTenantId(tenantSlug);
  if (tenantId == null) {
    throw new TRPCError({ code: "NOT_FOUND", message: TENANT_NOT_FOUND_ERR_MSG });
  }
  return tenantId;
}

export const publicTenantProcedure = publicProcedure.use(async ({ ctx, next }) => {
  const tenantId = await resolveTenantOrThrow(ctx.tenantSlug);
  return next({ ctx: { ...ctx, tenantId } });
});

export const writeTenantProcedure = writeProcedure.use(async ({ ctx, next }) => {
  const tenantId = await resolveTenantOrThrow(ctx.tenantSlug);
  return next({ ctx: { ...ctx, tenantId } });
});

export const protectedTenantProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const tenantId = await resolveTenantOrThrow(ctx.tenantSlug);
  return next({ ctx: { ...ctx, tenantId } });
});
