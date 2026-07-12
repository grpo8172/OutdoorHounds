import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG, PAYWALL_ERR_MSG, GUEST_LIMIT_ERR_MSG, DAILY_CAP_ERR_MSG } from "../../shared/const.js";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { ENV } from "./env";
import {
  hasActiveSubscription,
  hasActiveAdminSubscription,
  consumeWriteQuota,
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
//   - $10 base unlock:         PAID_DAILY_WRITE_LIMIT/day, then another $10
//                               payment tops up +PAID_DAILY_WRITE_LIMIT for
//                               the rest of the day (see topUpDailyWriteQuota,
//                               wired into subscriptions.captureOrder)
//   - $30 admin unlock:        uncapped — a trusted, elevated tier
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
