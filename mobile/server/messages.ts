import { z } from "zod";
import { protectedProcedure, writeProcedure, router } from "./_core/trpc";
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

  getSavedItems: protectedProcedure.query(async ({ ctx }) => {
    return getSavedItems(ctx.user.id);
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

  getMyConversations: protectedProcedure.query(async ({ ctx }) => {
    return getMyConversations(ctx.user.id);
  }),

  getConversationProfile: protectedProcedure
    .input(z.object({ conversationId: z.number() }))
    .query(async ({ ctx, input }) => {
      const convs = await getMyConversations(ctx.user.id);
      const conv = convs.find(c => c.id === input.conversationId);
      if (!conv) return null;
      return conv.buyerProfile ?? null;
    }),
});
