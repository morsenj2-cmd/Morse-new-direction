import { Resend } from "resend";
import { env } from "../env";

const resend = new Resend(env.resendApiKey);

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  return resend.emails.send({
    from: env.emailFrom,
    to,
    subject,
    html,
  });
}
