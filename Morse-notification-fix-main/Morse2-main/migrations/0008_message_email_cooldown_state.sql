CREATE TABLE IF NOT EXISTS message_email_dispatch_state (
  recipient_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_id varchar NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  last_email_sent_at timestamp NOT NULL DEFAULT NOW(),
  CONSTRAINT message_email_dispatch_state_pk PRIMARY KEY (recipient_id, conversation_id)
);

CREATE INDEX IF NOT EXISTS message_email_dispatch_state_recipient_conversation_idx
  ON message_email_dispatch_state(recipient_id, conversation_id);
