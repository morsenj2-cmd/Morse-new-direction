import { resend } from "./resend";
import { env } from "../env";

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!to) return;

  await resend.emails.send({
    from: env.emailFrom,
    to,
    subject,
    html,
  });
}
