ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_notifications_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_messages_enabled boolean NOT NULL DEFAULT true;
