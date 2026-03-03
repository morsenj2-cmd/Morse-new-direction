import { pool } from "./db";
import { seedTagsIfEmpty } from "./storage";
import { seedRadarOpportunitiesIfEmpty } from "./services/opportunityService";

export async function runSafeMigrations(): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(918273645)");

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'communities_name_unique'
        ) THEN
          ALTER TABLE communities ADD CONSTRAINT communities_name_unique UNIQUE (name);
        END IF;
      END $$;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS blog_posts (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        author_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        content TEXT NOT NULL,
        excerpt TEXT,
        cover_image_url TEXT,
        published BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`ALTER TABLE tags ADD COLUMN IF NOT EXISTS normalized_name TEXT;`);
    await client.query(`UPDATE tags SET normalized_name = LOWER(REGEXP_REPLACE(TRIM(name), '[^a-z0-9\\s-]', '', 'g')) WHERE normalized_name IS NULL;`);
    await client.query(`UPDATE tags SET normalized_name = REGEXP_REPLACE(normalized_name, '\\s+', '-', 'g') WHERE normalized_name IS NOT NULL;`);
    await client.query(`UPDATE tags SET normalized_name = CONCAT('tag-', id) WHERE normalized_name IS NULL OR normalized_name = '';`);
    await client.query(`
      WITH ranked AS (
        SELECT id, normalized_name, ROW_NUMBER() OVER (PARTITION BY normalized_name ORDER BY created_at, id) AS rn
        FROM tags
      )
      UPDATE tags t
      SET normalized_name = CONCAT(t.normalized_name, '-', ranked.rn)
      FROM ranked
      WHERE t.id = ranked.id AND ranked.rn > 1;
    `);
    await client.query(`ALTER TABLE tags ALTER COLUMN normalized_name SET NOT NULL;`);
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS tags_normalized_name_unique ON tags(normalized_name);`);

    await client.query(`ALTER TABLE user_tags ADD COLUMN IF NOT EXISTS weight INTEGER NOT NULL DEFAULT 1;`);
    await client.query(`ALTER TABLE user_tags ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();`);
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS user_tags_user_tag_unique ON user_tags(user_id, tag_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS user_tags_tag_user_overlap_idx ON user_tags(tag_id, user_id);`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS opportunities (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        description TEXT,
        type TEXT NOT NULL DEFAULT 'job',
        quality_score INTEGER NOT NULL DEFAULT 0,
        source TEXT NOT NULL DEFAULT 'unknown',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'job';`);
    await client.query(`ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS quality_score INTEGER NOT NULL DEFAULT 0;`);
    await client.query(`ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'unknown';`);
    await client.query(`CREATE INDEX IF NOT EXISTS opportunities_created_at_idx ON opportunities(created_at);`);
    await client.query(`CREATE INDEX IF NOT EXISTS opportunities_quality_created_idx ON opportunities(quality_score, created_at);`);
    await client.query(`CREATE INDEX IF NOT EXISTS opportunities_type_idx ON opportunities(type);`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS opportunity_tags (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        opportunity_id VARCHAR NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
        tag_id VARCHAR NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
        weight INTEGER NOT NULL DEFAULT 1
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS tag_aliases (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        alias TEXT NOT NULL,
        normalized_alias TEXT NOT NULL UNIQUE,
        canonical_tag_id VARCHAR NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS opportunity_tags_opportunity_tag_unique ON opportunity_tags(opportunity_id, tag_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS opportunity_tags_tag_opportunity_overlap_idx ON opportunity_tags(tag_id, opportunity_id);`);
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS tag_aliases_normalized_alias_unique ON tag_aliases(normalized_alias);`);
    await client.query(`CREATE INDEX IF NOT EXISTS tag_aliases_canonical_tag_idx ON tag_aliases(canonical_tag_id);`);


    await client.query(`
      CREATE TABLE IF NOT EXISTS user_notification_settings (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        email_notifications_enabled BOOLEAN NOT NULL DEFAULT true,
        email_messages_enabled BOOLEAN NOT NULL DEFAULT true,
        push_notifications_enabled BOOLEAN NOT NULL DEFAULT true,
        weekly_digest_enabled BOOLEAN NOT NULL DEFAULT true,
        opportunity_alerts_enabled BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`ALTER TABLE user_notification_settings ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN NOT NULL DEFAULT true;`);
    await client.query(`ALTER TABLE user_notification_settings ADD COLUMN IF NOT EXISTS email_messages_enabled BOOLEAN NOT NULL DEFAULT true;`);
    await client.query(`ALTER TABLE user_notification_settings ADD COLUMN IF NOT EXISTS push_notifications_enabled BOOLEAN NOT NULL DEFAULT true;`);
    await client.query(`ALTER TABLE user_notification_settings ADD COLUMN IF NOT EXISTS weekly_digest_enabled BOOLEAN NOT NULL DEFAULT true;`);
    await client.query(`ALTER TABLE user_notification_settings ADD COLUMN IF NOT EXISTS opportunity_alerts_enabled BOOLEAN NOT NULL DEFAULT true;`);

    await client.query(`
      INSERT INTO user_notification_settings (user_id)
      SELECT u.id
      FROM users u
      LEFT JOIN user_notification_settings uns ON uns.user_id = u.id
      WHERE uns.user_id IS NULL;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS notification_cooldowns (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        conversation_id VARCHAR NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        last_sent_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS notification_cooldowns_user_conversation_unique ON notification_cooldowns(user_id, conversation_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS notification_cooldowns_last_sent_idx ON notification_cooldowns(last_sent_at);`);

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  await seedTagsIfEmpty();
  await seedRadarOpportunitiesIfEmpty();
}
