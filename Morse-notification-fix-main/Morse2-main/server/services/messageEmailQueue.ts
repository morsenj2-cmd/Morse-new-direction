import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { conversations, messageEmailDispatchState, messages, notifications, users } from "@shared/schema";
import { emailQueue } from "./emailQueue";
import { renderNewMessageEmail } from "../emails/newMessageEmail";

const inFlight = new Set<string>();
const MESSAGE_EMAIL_COOLDOWN_MS = 2 * 60 * 1000;

async function processMessageEmailNotification(messageId: string): Promise<void> {
  if (!messageId || inFlight.has(messageId)) return;
  inFlight.add(messageId);

  try {
    const [message] = await db.select().from(messages).where(eq(messages.id, messageId));
    if (!message) return;

    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, message.conversationId));
    if (!conversation) return;

    const recipientId = conversation.participant1Id === message.senderId
      ? conversation.participant2Id
      : conversation.participant1Id;

    if (!recipientId || recipientId === message.senderId) return;

    const [alreadySent] = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(and(
        eq(notifications.type, "message_email"),
        eq(notifications.entityId, messageId),
        eq(notifications.recipientId, recipientId),
      ));

    if (alreadySent) return;

    const [recipient] = await db.select().from(users).where(eq(users.id, recipientId));
    const [sender] = await db.select().from(users).where(eq(users.id, message.senderId));

    if (!recipient || !sender) return;
    if (!recipient.email) return;
    if (!recipient.emailNotificationsEnabled || !recipient.emailMessagesEnabled) return;

    const [dispatchState] = await db
      .select()
      .from(messageEmailDispatchState)
      .where(and(
        eq(messageEmailDispatchState.recipientId, recipientId),
        eq(messageEmailDispatchState.conversationId, message.conversationId),
      ));

    if (dispatchState?.lastEmailSentAt) {
      const lastSentAt = new Date(dispatchState.lastEmailSentAt);
      if (!Number.isNaN(lastSentAt.getTime()) && Date.now() - lastSentAt.getTime() < MESSAGE_EMAIL_COOLDOWN_MS) {
        return;
      }
    }

    const email = renderNewMessageEmail({
      senderName: sender.displayName || sender.username || "Someone",
      message: String(message.content || ""),
      conversationId: message.conversationId,
    });

    await db.insert(notifications).values({
      recipientId,
      actorId: sender.id,
      type: "message_email",
      entityId: messageId,
    });

    emailQueue.add({
      userId: recipientId,
      to: recipient.email,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });

    await db
      .insert(messageEmailDispatchState)
      .values({
        recipientId,
        conversationId: message.conversationId,
        lastEmailSentAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [messageEmailDispatchState.recipientId, messageEmailDispatchState.conversationId],
        set: { lastEmailSentAt: new Date() },
      });
  } catch (error) {
    console.error("[message-email] queue processing failed", {
      messageId,
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    inFlight.delete(messageId);
  }
}

export function queueMessageEmailNotification(messageId: string): void {
  setTimeout(() => {
    void processMessageEmailNotification(messageId);
  }, 0);
}
