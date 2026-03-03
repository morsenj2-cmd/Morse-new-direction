import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { newDMEmail } from "../lib/emailTemplates";
import { sendEmail } from "./emailService";
import {
  notificationCooldowns,
  userNotificationSettings,
  users,
} from "@shared/schema";

type MessageEmailJob = {
  key: string;
  messageId: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  contentPreview: string;
};

const COOLDOWN_WINDOW_MS = 15 * 60 * 1000;
const PROCESSED_KEY_TTL_MS = 60 * 60 * 1000;

const queue: MessageEmailJob[] = [];
const queuedKeys = new Set<string>();
const processedKeys = new Map<string, number>();
let workerRunning = false;

type PreferenceCacheEntry = {
  expiresAt: number;
  emailNotificationsEnabled: boolean;
  emailMessagesEnabled: boolean;
};

const PREFERENCE_CACHE_TTL_MS = 60 * 1000;
const preferenceCache = new Map<string, PreferenceCacheEntry>();

function pruneProcessedKeys(now: number): void {
  for (const [key, ts] of processedKeys.entries()) {
    if (now - ts > PROCESSED_KEY_TTL_MS) {
      processedKeys.delete(key);
    }
  }
}

async function shouldSendEmail(recipientId: string, conversationId: string): Promise<boolean> {
  const now = Date.now();
  const cachedPref = preferenceCache.get(recipientId);

  let emailNotificationsEnabled = true;
  let emailMessagesEnabled = true;

  if (cachedPref && cachedPref.expiresAt > now) {
    emailNotificationsEnabled = cachedPref.emailNotificationsEnabled;
    emailMessagesEnabled = cachedPref.emailMessagesEnabled;
  } else {
    const [pref] = await db
      .select({
        emailNotificationsEnabled: userNotificationSettings.emailNotificationsEnabled,
        emailMessagesEnabled: userNotificationSettings.emailMessagesEnabled,
      })
      .from(userNotificationSettings)
      .where(eq(userNotificationSettings.userId, recipientId))
      .limit(1);

    emailNotificationsEnabled = pref?.emailNotificationsEnabled ?? true;
    emailMessagesEnabled = pref?.emailMessagesEnabled ?? true;

    preferenceCache.set(recipientId, {
      expiresAt: now + PREFERENCE_CACHE_TTL_MS,
      emailNotificationsEnabled,
      emailMessagesEnabled,
    });
  }

  if (!emailNotificationsEnabled || !emailMessagesEnabled) {
    return false;
  }

  const [cooldown] = await db
    .select({ lastSentAt: notificationCooldowns.lastSentAt })
    .from(notificationCooldowns)
    .where(
      and(
        eq(notificationCooldowns.userId, recipientId),
        eq(notificationCooldowns.conversationId, conversationId),
      ),
    )
    .limit(1);

  if (!cooldown?.lastSentAt) {
    return true;
  }

  const elapsed = Date.now() - new Date(cooldown.lastSentAt).getTime();
  return elapsed >= COOLDOWN_WINDOW_MS;
}

async function touchCooldown(recipientId: string, conversationId: string): Promise<void> {
  const now = new Date();

  await db
    .insert(notificationCooldowns)
    .values({
      userId: recipientId,
      conversationId,
      lastSentAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [notificationCooldowns.userId, notificationCooldowns.conversationId],
      set: {
        lastSentAt: now,
        updatedAt: now,
      },
    });
}

async function processJob(job: MessageEmailJob): Promise<void> {
  const [sender, recipient] = await Promise.all([
    db.select().from(users).where(eq(users.id, job.senderId)).limit(1),
    db.select().from(users).where(eq(users.id, job.recipientId)).limit(1),
  ]);

  const senderUser = sender[0];
  const recipientUser = recipient[0];

  if (!recipientUser?.email) return;

  const allowed = await shouldSendEmail(job.recipientId, job.conversationId);
  if (!allowed) return;

  const email = newDMEmail(
    recipientUser.username || "User",
    senderUser?.username || "Someone",
    job.contentPreview,
  );

  await sendEmail({
    to: recipientUser.email,
    subject: email.subject,
    html: email.html,
  });

  await touchCooldown(job.recipientId, job.conversationId);
}

async function runWorker(): Promise<void> {
  if (workerRunning) return;
  workerRunning = true;

  try {
    while (queue.length > 0) {
      const job = queue.shift();
      if (!job) continue;

      queuedKeys.delete(job.key);

      try {
        await processJob(job);
      } catch (error) {
        console.error("MESSAGE_EMAIL_WORKER_JOB_FAILED", error);
      } finally {
        processedKeys.set(job.key, Date.now());
      }
    }
  } finally {
    workerRunning = false;
  }
}

export function enqueueMessageEmailJob(input: {
  messageId: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  contentPreview: string;
}): void {
  const key = `${input.messageId}:${input.recipientId}`;
  const now = Date.now();

  pruneProcessedKeys(now);

  // idempotent enqueue: avoid duplicates in-queue and recently-processed jobs
  if (queuedKeys.has(key) || processedKeys.has(key)) {
    return;
  }

  queue.push({ key, ...input });
  queuedKeys.add(key);

  setImmediate(() => {
    void runWorker();
  });
}
