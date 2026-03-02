DO $$ BEGIN
  CREATE TYPE user_opportunity_action_type AS ENUM ('save', 'dismiss', 'apply', 'view');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE user_opportunity_actions
  ALTER COLUMN action_type TYPE user_opportunity_action_type
  USING action_type::user_opportunity_action_type;

ALTER TABLE user_opportunity_actions
  DROP COLUMN IF EXISTS action_count,
  DROP COLUMN IF EXISTS last_applied_count,
  DROP COLUMN IF EXISTS updated_at;
