type RenderNewMessageEmailData = {
  senderName: string;
  message: string;
  conversationId: string;
  appUrl?: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderNewMessageEmail(data: RenderNewMessageEmailData): { subject: string; html: string; text: string } {
  const senderName = data.senderName?.trim() || "Someone";
  const preview = (data.message || "").trim().slice(0, 120);
  const appUrl = (data.appUrl || process.env.APP_URL || "https://morse.co.in").replace(/\/$/, "");
  const conversationLink = `${appUrl}/messages?conversationId=${encodeURIComponent(data.conversationId)}`;

  const escapedSender = escapeHtml(senderName);
  const escapedPreview = escapeHtml(preview || "Open Morse to read the new message.");

  return {
    subject: "New message on Morse",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #111827;">
        <div style="background:#0f172a; color:#ffffff; padding:16px 20px; border-radius:10px 10px 0 0; font-size:20px; font-weight:700;">
          Morse
        </div>
        <div style="border:1px solid #e5e7eb; border-top:none; padding:20px; border-radius:0 0 10px 10px;">
          <p style="margin:0 0 10px; font-size:15px;">You have a new message from <strong>${escapedSender}</strong>.</p>
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px; margin:14px 0; font-size:14px; color:#334155;">
            ${escapedPreview}
          </div>
          <a href="${conversationLink}" style="display:inline-block; background:#0f766e; color:#ffffff; text-decoration:none; padding:10px 14px; border-radius:8px; font-weight:600;">Open conversation</a>
        </div>
      </div>
    `,
    text: `New message on Morse\n\nFrom: ${senderName}\nPreview: ${preview || "Open Morse to read the new message."}\nOpen conversation: ${conversationLink}`,
  };
}
