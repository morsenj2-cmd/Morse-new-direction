import nodemailer, { type Transporter } from "nodemailer";
import { Resend } from "resend";

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

type SendEmailResult = {
  success: boolean;
  provider: string;
  messageId?: string;
  error?: string;
};

type EmailProvider = {
  name: string;
  send: (payload: SendEmailInput) => Promise<{ messageId?: string }>;
};

let smtpTransporter: Transporter | null = null;

function getSmtpTransporter(): Transporter {
  if (smtpTransporter) return smtpTransporter;

  smtpTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return smtpTransporter;
}

function createProvider(): EmailProvider {
  const provider = String(process.env.EMAIL_PROVIDER || "smtp").toLowerCase();

  if (provider === "resend") {
    const resend = new Resend(process.env.RESEND_API_KEY);
    return {
      name: "resend",
      send: async ({ to, subject, html, text }) => {
        const result = await resend.emails.send({
          from: process.env.EMAIL_FROM || "no-reply@example.com",
          to,
          subject,
          html,
          text,
        });

        return { messageId: (result as any)?.data?.id || undefined };
      },
    };
  }

  return {
    name: "smtp",
    send: async ({ to, subject, html, text }) => {
      const transporter = getSmtpTransporter();
      const info = await transporter.sendMail({
        from: process.env.EMAIL_FROM || "no-reply@example.com",
        to,
        subject,
        html,
        text,
      });

      return { messageId: info.messageId };
    },
  };
}

function safeLogFailure(error: unknown, context: { provider: string; to: string; subject: string; attempt: number }) {
  const message = error instanceof Error ? error.message : String(error);
  console.error("[email] send failed", {
    provider: context.provider,
    to: context.to,
    subject: context.subject,
    attempt: context.attempt,
    error: message,
  });
}

export async function sendEmail({ to, subject, html, text }: SendEmailInput): Promise<SendEmailResult> {
  const provider = createProvider();

  if (!to || !subject || !html) {
    return {
      success: false,
      provider: provider.name,
      error: "Missing required email fields",
    };
  }

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const result = await provider.send({ to, subject, html, text });
      return {
        success: true,
        provider: provider.name,
        messageId: result.messageId,
      };
    } catch (error) {
      safeLogFailure(error, { provider: provider.name, to, subject, attempt });
      if (attempt === 2) {
        return {
          success: false,
          provider: provider.name,
          error: error instanceof Error ? error.message : "Unknown email failure",
        };
      }
    }
  }

  return {
    success: false,
    provider: provider.name,
    error: "Unexpected email failure",
  };
}
