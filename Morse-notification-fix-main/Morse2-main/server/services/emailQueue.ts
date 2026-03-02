import { sendEmail } from "./emailService";

type EmailJob = {
  userId: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
};

const queue: EmailJob[] = [];
const WINDOW_MS = 60_000;
const MAX_PER_MINUTE = Number(process.env.EMAIL_QUEUE_MAX_PER_MINUTE || 20);
const recentByUser = new Map<string, number[]>();
let running = false;

function prune(now: number, timestamps: number[]): number[] {
  return timestamps.filter((ts) => now - ts < WINDOW_MS);
}

function allowedForUser(userId: string): boolean {
  const now = Date.now();
  const current = prune(now, recentByUser.get(userId) || []);
  recentByUser.set(userId, current);
  return current.length < MAX_PER_MINUTE;
}

function markSent(userId: string): void {
  const now = Date.now();
  const current = prune(now, recentByUser.get(userId) || []);
  current.push(now);
  recentByUser.set(userId, current);
}

async function processNext(): Promise<void> {
  const job = queue.shift();
  if (!job) return;

  if (!allowedForUser(job.userId)) {
    console.warn("[email-queue] rate-limited job", { userId: job.userId, to: job.to });
    return;
  }

  const result = await sendEmail({
    to: job.to,
    subject: job.subject,
    html: job.html,
    text: job.text,
  });

  if (result.success) {
    markSent(job.userId);
  }
}

async function worker(): Promise<void> {
  if (running) return;
  running = true;

  try {
    while (queue.length > 0) {
      await processNext();
    }
  } catch (error) {
    console.error("[email-queue] worker failed", error instanceof Error ? error.message : String(error));
  } finally {
    running = false;
    if (queue.length > 0) {
      setTimeout(() => {
        void worker();
      }, 0);
    }
  }
}

export const emailQueue = {
  add(job: EmailJob): void {
    queue.push(job);
    setTimeout(() => {
      void worker();
    }, 0);
  },
};

export type { EmailJob };
