ALTER TABLE tags
  ADD COLUMN IF NOT EXISTS category text;

ALTER TABLE user_tags
  ADD COLUMN IF NOT EXISTS weight real NOT NULL DEFAULT 1.0;

-- Remove duplicate user-tag mappings before adding uniqueness constraint.
DELETE FROM user_tags ut
USING user_tags dup
WHERE ut.user_id = dup.user_id
  AND ut.tag_id = dup.tag_id
  AND ut.id > dup.id;

CREATE INDEX IF NOT EXISTS tags_name_idx ON tags(name);
CREATE INDEX IF NOT EXISTS user_tags_user_id_tag_id_idx ON user_tags(user_id, tag_id);
CREATE UNIQUE INDEX IF NOT EXISTS user_tags_user_id_tag_id_unique ON user_tags(user_id, tag_id);

CREATE TABLE IF NOT EXISTS opportunity_tags (
  opportunity_id varchar NOT NULL REFERENCES launches(id) ON DELETE CASCADE,
  tag_id varchar NOT NULL REFERENCES tags(id) ON DELETE CASCADE
);

-- Remove duplicate opportunity-tag mappings before adding uniqueness.
DELETE FROM opportunity_tags ot
USING opportunity_tags dup
WHERE ot.opportunity_id = dup.opportunity_id
  AND ot.tag_id = dup.tag_id
  AND ot.ctid > dup.ctid;

CREATE INDEX IF NOT EXISTS opportunity_tags_opportunity_id_tag_id_idx
  ON opportunity_tags(opportunity_id, tag_id);
CREATE UNIQUE INDEX IF NOT EXISTS opportunity_tags_opportunity_id_tag_id_unique
  ON opportunity_tags(opportunity_id, tag_id);
