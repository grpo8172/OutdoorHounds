import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { UNLOCK_PRICE_CENTS, ADMIN_UNLOCK_PRICE_CENTS } from "../shared/const.js";
import { protectedProcedure, router } from "./_core/trpc";
import {
  hasActiveSubscription,
  hasActiveAdminSubscription,
  hasSubscriptionForTransaction,
  recordVerifiedPayment,
  getAdminTokenForUser,
  topUpDailyWriteQuota,
  PAID_DAILY_WRITE_LIMIT,
} from "./db";
import { capturePayPalOrder, createPayPalOrder } from "./_core/paypal";

const UNLOCK_CURRENCY = "USD";

export const subscriptionsRouter = router({
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const active = await hasActiveSubscription(ctx.user.id);
    return { active };
  }),

  // Step 1: create a PayPal order and hand back the approval URL for the
  // client to open (in-app browser on native, redirect on web).
  createOrder: protectedProcedure
    .input(z.object({ returnUrl: z.string().url(), cancelUrl: z.string().url() }))
    .mutation(async ({ input }) => {
      const { orderId, approveUrl } = await createPayPalOrder({
        amountCents: UNLOCK_PRICE_CENTS,
        currency: UNLOCK_CURRENCY,
        returnUrl: input.returnUrl,
        cancelUrl: input.cancelUrl,
      });
      return { orderId, approveUrl };
    }),

  // Step 2: once the user approves on PayPal's side, capture the order.
  // This is the actual server-to-server verification — we never trust the
  // client's word that payment happened.
  captureOrder: protectedProcedure
    .input(z.object({ orderId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const capture = await capturePayPalOrder(input.orderId);

      if (capture.status !== "COMPLETED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "PayPal payment was not completed",
        });
      }

      const transactionId = capture.transactionId ?? input.orderId;

      if (await hasSubscriptionForTransaction(transactionId)) {
        return { success: true };
      }

      await recordVerifiedPayment(
        ctx.user.id,
        capture.amountCents ?? UNLOCK_PRICE_CENTS,
        capture.currency ?? UNLOCK_CURRENCY,
        transactionId,
        "listing",
      );

      // A repeat $10 purchase while already unlocked is a same-day top-up:
      // grants PAID_DAILY_WRITE_LIMIT more writes for today on top of the
      // base daily cap (see writeProcedure in _core/trpc.ts). No-op for a
      // first-time purchase, since a brand-new paid user already starts
      // today with a fresh full quota.
      await topUpDailyWriteQuota(ctx.user.id, PAID_DAILY_WRITE_LIMIT);

      return { success: true };
    }),

  createAdminOrder: protectedProcedure
    .input(z.object({ returnUrl: z.string().url(), cancelUrl: z.string().url() }))
    .mutation(async ({ input }) => {
      const { orderId, approveUrl } = await createPayPalOrder({
        amountCents: ADMIN_UNLOCK_PRICE_CENTS,
        currency: UNLOCK_CURRENCY,
        returnUrl: input.returnUrl,
        cancelUrl: input.cancelUrl,
      });
      return { orderId, approveUrl };
    }),

  captureAdminOrder: protectedProcedure
    .input(z.object({ orderId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const capture = await capturePayPalOrder(input.orderId);

      if (capture.status !== "COMPLETED") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "PayPal payment was not completed" });
      }

      const transactionId = capture.transactionId ?? input.orderId;

      if (await hasSubscriptionForTransaction(transactionId)) {
        const token = await getAdminTokenForUser(ctx.user.id);
        return { success: true, adminToken: token };
      }

      const adminToken = await recordVerifiedPayment(
        ctx.user.id,
        capture.amountCents ?? ADMIN_UNLOCK_PRICE_CENTS,
        capture.currency ?? UNLOCK_CURRENCY,
        transactionId,
        "admin",
      );

      return { success: true, adminToken };
    }),

  getAdminStatus: protectedProcedure.query(async ({ ctx }) => {
    const active = await hasActiveAdminSubscription(ctx.user.id);
    const adminToken = active ? await getAdminTokenForUser(ctx.user.id) : null;
    return { active, adminToken };
  }),
});
