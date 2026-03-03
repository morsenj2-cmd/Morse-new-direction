import { storage } from "../storage";
import { enqueueMessageEmailJob } from "./messageDeliveryService";
import { emitMessageCreated } from "./messageRealtimeService";

type SendReliableMessageInput = {
  conversationId: string;
  senderId: string;
  content: string;
  idempotencyKey?: string;
};

const IDEMPOTENCY_TTL_MS = 5 * 60 * 1000;
const idempotentMessageCache = new Map<string, { createdAt: number; message: any }>();

function buildIdempotencyKey(input: SendReliableMessageInput): string {
  if (input.idempotencyKey && input.idempotencyKey.trim()) {
    return `${input.conversationId}:${input.senderId}:${input.idempotencyKey.trim()}`;
  }

  // Defensive fallback key to avoid accidental duplicate sends on rapid retries.
  return `${input.conversationId}:${input.senderId}:${input.content.trim()}`;
}

function cleanupIdempotencyCache(now: number): void {
  for (const [key, entry] of idempotentMessageCache.entries()) {
    if (now - entry.createdAt > IDEMPOTENCY_TTL_MS) {
      idempotentMessageCache.delete(key);
    }
  }
}

export async function sendReliableMessage(input: SendReliableMessageInput) {
  const content = input.content.trim();
  if (!content) {
    throw new Error("Content required");
  }

  const idempotencyKey = buildIdempotencyKey(input);
  const now = Date.now();
  cleanupIdempotencyCache(now);

  const existing = idempotentMessageCache.get(idempotencyKey);
  if (existing) {
    return existing.message;
  }

  // 1) insert message + 2) update conversation timestamp are done inside storage.sendMessage
  const message = await storage.sendMessage(input.conversationId, input.senderId, content);

  const conversation = await storage.getConversationById(input.conversationId);
  if (!conversation) {
    idempotentMessageCache.set(idempotencyKey, { createdAt: now, message });
    return message;
  }

  const recipientId =
    conversation.participant1Id === input.senderId
      ? conversation.participant2Id
      : conversation.participant1Id;

  if (recipientId && recipientId !== input.senderId) {
    // 3) emit realtime event (deduped)
    emitMessageCreated({
      messageId: message.id,
      conversationId: input.conversationId,
      senderId: input.senderId,
      recipientId,
      createdAt: message.createdAt ?? null,
    });

    // fire-and-forget notification; never block message API
    void storage
      .createNotification({
        recipientId,
        actorId: input.senderId,
        type: "message",
        entityId: input.conversationId,
        title: "New message",
        body: "You received a new message",
      })
      .catch((error) => {
        console.error("MESSAGE_NOTIFICATION_FAILED", error);
      });

    // 4) enqueue email job async; do not await
    enqueueMessageEmailJob({
      messageId: message.id,
      conversationId: input.conversationId,
      senderId: input.senderId,
      recipientId,
      contentPreview: content.slice(0, 200),
    });
  }

  idempotentMessageCache.set(idempotencyKey, { createdAt: now, message });

  // 5) return success immediately
  return message;
}
