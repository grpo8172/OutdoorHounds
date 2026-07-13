import { z } from "zod";
import { protectedProcedure, protectedTenantProcedure, writeProcedure, router } from "./_core/trpc";
import {
  getOrCreateConversation,
  getMessages,
  createMessage,
  getMyConversations,
  persistSwipe,
  getSavedItemIds,
  getSavedItems,
  getProfileByUserId,
} from "./db";

export const messagesRouter = router({
  saveItem: writeProcedure
    .input(z.object({ itemId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await persistSwipe(ctx.user.id, input.itemId);
      return { ok: true };
    }),

  getSavedItemIds: protectedProcedure.query(async ({ ctx }) => {
    return getSavedItemIds(ctx.user.id);
  }),

  getSavedItems: protectedTenantProcedure.query(async ({ ctx }) => {
    return getSavedItems(ctx.user.id, ctx.tenantId);
  }),

  startConversation: writeProcedure
    .input(z.object({ itemId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return getOrCreateConversation(ctx.user.id, input.itemId);
    }),

  getMessages: protectedProcedure
    .input(z.object({ conversationId: z.number() }))
    .query(async ({ input }) => {
      return getMessages(input.conversationId);
    }),

  sendMessage: writeProcedure
    .input(z.object({ conversationId: z.number(), body: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return createMessage(input.conversationId, ctx.user.id, input.body);
    }),

  getMyConversations: protectedTenantProcedure.query(async ({ ctx }) => {
    return getMyConversations(ctx.user.id, ctx.tenantId);
  }),

  getConversationProfile: protectedTenantProcedure
    .input(z.object({ conversationId: z.number() }))
    .query(async ({ ctx, input }) => {
      const convs = await getMyConversations(ctx.user.id, ctx.tenantId);
      const conv = convs.find(c => c.id === input.conversationId);
      if (!conv) return null;
      return conv.buyerProfile ?? null;
    }),
});
