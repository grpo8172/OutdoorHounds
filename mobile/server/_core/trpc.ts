import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG, PAYWALL_ERR_MSG, GUEST_LIMIT_ERR_MSG, DAILY_CAP_ERR_MSG, TENANT_NOT_FOUND_ERR_MSG } from "../../shared/const.js";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
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

// Gate for any write action (create listing, send message, edit profile,
// etc.), tiered to keep any one account from hammering the API:
//   - guest (no login):        GUEST_DAILY_WRITE_LIMIT/day, then must sign in
//   - $1 base unlock:          PAID_DAILY_WRITE_LIMIT/day, then another $1
//                               payment tops up +PAID_DAILY_WRITE_LIMIT for
//                               the rest of the day (see topUpDailyWriteQuota,
//                               wired into subscriptions.captureOrder)
//   - $5 admin unlock:         uncapped — a trusted, elevated tier
// Payment endpoints themselves (subscriptions router) must NOT use this —
// you can't require having already paid in order to pay.
export const writeProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;

    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    }

    if (!ENV.isProduction) {
      return next({ ctx: { ...ctx, user: ctx.user } });
    }

    if (ctx.user.loginMethod === "guest") {
      const allowed = await consumeWriteQuota(ctx.user.id, GUEST_DAILY_WRITE_LIMIT);
      if (!allowed) {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: GUEST_LIMIT_ERR_MSG });
      }
      return next({ ctx: { ...ctx, user: ctx.user } });
    }

    if (await hasActiveAdminSubscription(ctx.user.id)) {
      return next({ ctx: { ...ctx, user: ctx.user } });
    }

    const unlocked = await hasActiveSubscription(ctx.user.id);
    if (!unlocked) {
      throw new TRPCError({ code: "FORBIDDEN", message: PAYWALL_ERR_MSG });
    }

    const allowed = await consumeWriteQuota(ctx.user.id, PAID_DAILY_WRITE_LIMIT);
    if (!allowed) {
      throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: DAILY_CAP_ERR_MSG });
    }

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
