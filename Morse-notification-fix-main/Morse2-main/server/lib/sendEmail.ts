import { resend } from "./resend";

export async function sendEmail({
  to,
  subject,
  html
}: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!to) return;

  await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to,
    subject,
    html
  });
}
