ALTER TABLE user_tags
  ADD COLUMN IF NOT EXISTS inferred boolean NOT NULL DEFAULT false;

ALTER TABLE user_tags
  ADD COLUMN IF NOT EXISTS last_interacted_at timestamp DEFAULT now();

UPDATE user_tags
SET last_interacted_at = COALESCE(last_interacted_at, now());

CREATE INDEX IF NOT EXISTS user_tags_user_id_last_interacted_idx
  ON user_tags(user_id, last_interacted_at);
