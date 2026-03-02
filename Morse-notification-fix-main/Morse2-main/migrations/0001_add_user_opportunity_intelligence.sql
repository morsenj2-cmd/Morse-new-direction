DO $$ BEGIN
  CREATE TYPE experience_level AS ENUM ('junior', 'mid', 'senior', 'founder');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS open_to_jobs boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS open_to_freelance boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS open_to_collab boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS experience_level experience_level;
