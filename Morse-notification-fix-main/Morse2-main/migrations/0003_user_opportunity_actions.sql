CREATE TABLE IF NOT EXISTS user_opportunity_actions (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  opportunity_id varchar NOT NULL REFERENCES launches(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  action_count integer NOT NULL DEFAULT 0,
  last_applied_count integer NOT NULL DEFAULT 0,
  created_at timestamp DEFAULT NOW(),
  updated_at timestamp DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS user_opportunity_actions_unique
  ON user_opportunity_actions(user_id, opportunity_id, action_type);

CREATE INDEX IF NOT EXISTS user_opportunity_actions_user_opp_idx
  ON user_opportunity_actions(user_id, opportunity_id);
