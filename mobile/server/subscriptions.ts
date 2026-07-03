import { UNLOCK_PRICE_CENTS } from "../shared/const.js";
import { protectedProcedure, router } from "./_core/trpc";
import { hasActiveSubscription, recordHostedButtonPayment } from "./db";

export const subscriptionsRouter = router({
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const active = await hasActiveSubscription(ctx.user.id);
    return { active };
  }),

  // Self-reported completion of the PayPal Hosted Button checkout — not
  // verified against PayPal. Fine for a small trusted user base; if this
  // needs to scale or support automatic refund handling, switch to the
  // PayPal Orders API (create/capture tied to the user, verified webhooks).
  markPaid: protectedProcedure.mutation(async ({ ctx }) => {
    await recordHostedButtonPayment(ctx.user.id, UNLOCK_PRICE_CENTS);
    return { success: true };
  }),
});
