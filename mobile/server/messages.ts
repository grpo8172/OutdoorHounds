import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import {
  getOrCreateConversation,
  getMessages,
  createMessage,
  getMyConversations,
  persistSwipe,
  getSavedItemIds,
} from "./db";

export const messagesRouter = router({
  saveItem: protectedProcedure
    .input(z.object({ itemId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await persistSwipe(ctx.user.id, input.itemId);
      return { ok: true };
    }),

  getSavedItemIds: protectedProcedure.query(async ({ ctx }) => {
    return getSavedItemIds(ctx.user.id);
  }),

  startConversation: protectedProcedure
    .input(z.object({ itemId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return getOrCreateConversation(ctx.user.id, input.itemId);
    }),

  getMessages: protectedProcedure
    .input(z.object({ conversationId: z.number() }))
    .query(async ({ input }) => {
      return getMessages(input.conversationId);
    }),

  sendMessage: protectedProcedure
    .input(z.object({ conversationId: z.number(), body: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return createMessage(input.conversationId, ctx.user.id, input.body);
    }),

  getMyConversations: protectedProcedure.query(async ({ ctx }) => {
    return getMyConversations(ctx.user.id);
  }),
});
