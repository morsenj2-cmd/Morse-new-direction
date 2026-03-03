import { queryClient } from "./queryClient";
import { toast } from "@/hooks/use-toast";

type MessageCreatedPayload = {
  messageId: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  createdAt: string | null;
};

type SocketEvent = {
  type: "message.created";
  data: MessageCreatedPayload;
};

type UnreadListener = (count: number) => void;

const seenMessageIds = new Set<string>();
const unreadListeners = new Set<UnreadListener>();
const recentToastTimestamps: number[] = [];

let unreadCount = 0;
let socket: WebSocket | null = null;
let activeUserId: string | null = null;
let reconnectTimer: number | null = null;
let fallbackPollTimer: number | null = null;

function notifyUnreadListeners() {
  for (const listener of unreadListeners) listener(unreadCount);
}

function setUnreadCount(next: number) {
  unreadCount = Math.max(0, next);
  notifyUnreadListeners();
}

function canShowToastBurstGuard(): boolean {
  const now = Date.now();
  while (recentToastTimestamps.length > 0 && now - recentToastTimestamps[0] > 10_000) {
    recentToastTimestamps.shift();
  }

  if (recentToastTimestamps.length >= 3) {
    return false;
  }

  recentToastTimestamps.push(now);
  return true;
}

function updateConversationPreview(conversationId: string) {
  queryClient.invalidateQueries({ queryKey: ["conversation", conversationId] });
  queryClient.invalidateQueries({ queryKey: ["conversations"] });
}

function handleMessageCreated(event: MessageCreatedPayload) {
  if (!activeUserId) return;
  if (event.senderId === activeUserId) return;
  if (seenMessageIds.has(event.messageId)) return;

  seenMessageIds.add(event.messageId);
  setUnreadCount(unreadCount + 1);
  updateConversationPreview(event.conversationId);

  if (canShowToastBurstGuard()) {
    toast({
      title: "New message",
      description: "You have a new message.",
    });
  }
}

function clearReconnectTimer() {
  if (reconnectTimer !== null) {
    window.clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

function ensureFallbackPolling() {
  if (fallbackPollTimer !== null) return;

  fallbackPollTimer = window.setInterval(() => {
    queryClient.invalidateQueries({ queryKey: ["conversations"] });
  }, 20_000);
}

function clearFallbackPolling() {
  if (fallbackPollTimer !== null) {
    window.clearInterval(fallbackPollTimer);
    fallbackPollTimer = null;
  }
}

function connectSocket(userId: string) {
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const url = `${protocol}://${window.location.host}/ws/messages?userId=${encodeURIComponent(userId)}`;

  const ws = new WebSocket(url);
  socket = ws;

  ws.onopen = () => {
    clearReconnectTimer();
    clearFallbackPolling();
  };

  ws.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data) as SocketEvent;
      if (payload.type === "message.created") {
        handleMessageCreated(payload.data);
      }
    } catch {
      // ignore malformed events
    }
  };

  ws.onclose = () => {
    if (socket === ws) {
      socket = null;
    }
    ensureFallbackPolling();

    clearReconnectTimer();
    reconnectTimer = window.setTimeout(() => {
      if (activeUserId) connectSocket(activeUserId);
    }, 3_000);
  };

  ws.onerror = () => {
    ws.close();
  };
}

export function startMessageRealtime(userId: string) {
  if (!userId) return;

  if (activeUserId === userId && socket) return;

  activeUserId = userId;
  if (socket) {
    socket.close();
    socket = null;
  }

  connectSocket(userId);
}

export function stopMessageRealtime() {
  activeUserId = null;
  if (socket) {
    socket.close();
    socket = null;
  }
  clearReconnectTimer();
  ensureFallbackPolling();
}

export function subscribeUnreadCount(listener: UnreadListener): () => void {
  unreadListeners.add(listener);
  listener(unreadCount);

  return () => {
    unreadListeners.delete(listener);
  };
}

export function markMessagesRead() {
  setUnreadCount(0);
}
