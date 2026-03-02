DO $$ BEGIN
  CREATE TYPE opportunity_type AS ENUM ('job', 'freelance', 'startup', 'repo', 'news');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS opportunities (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  type opportunity_type NOT NULL,
  title text NOT NULL,
  entity_name text NOT NULL,
  url text NOT NULL,
  tags text[] NOT NULL DEFAULT ARRAY[]::text[],
  location text,
  created_at timestamp DEFAULT NOW(),
  source text NOT NULL,
  quality_score real NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS opportunities_type_created_at_idx
  ON opportunities(type, created_at DESC);

CREATE INDEX IF NOT EXISTS opportunities_created_at_id_idx
  ON opportunities(created_at DESC, id DESC);
