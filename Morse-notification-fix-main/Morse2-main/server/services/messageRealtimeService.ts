import { EventEmitter } from "events";

export type MessageCreatedEvent = {
  messageId: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  createdAt: Date | null;
};

const emittedMessageIds = new Map<string, number>();
const EMIT_DEDUPE_TTL_MS = 5 * 60 * 1000;

export const messagingEventBus = new EventEmitter();

function cleanupOldEmits(now: number): void {
  for (const [messageId, timestamp] of emittedMessageIds.entries()) {
    if (now - timestamp > EMIT_DEDUPE_TTL_MS) {
      emittedMessageIds.delete(messageId);
    }
  }
}

export function emitMessageCreated(event: MessageCreatedEvent): void {
  if (!event.messageId) return;

  const now = Date.now();
  cleanupOldEmits(now);

  if (emittedMessageIds.has(event.messageId)) {
    return;
  }

  emittedMessageIds.set(event.messageId, now);
  messagingEventBus.emit("message.created", event);
}
