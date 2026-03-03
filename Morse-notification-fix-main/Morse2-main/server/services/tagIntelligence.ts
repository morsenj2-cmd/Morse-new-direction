import { eq } from "drizzle-orm";
import { db } from "../db";
import {
  opportunityTags,
  tagAliases,
  tags,
  userTags,
  type InsertTag,
} from "@shared/schema";

export type TagVector = Record<string, number>;

const BUILT_IN_ALIASES: Record<string, string> = {
  ai: "artificial-intelligence",
  "artificial intelligence": "artificial-intelligence",
  "ml": "machine-learning",
  "gen ai": "generative-ai",
};

export function normalizeTagName(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function dedupeAndNormalizeTags(rawTags: string[]): string[] {
  const unique = new Set<string>();

  for (const rawTag of rawTags) {
    const normalized = normalizeTagName(rawTag);
    if (!normalized) continue;
    unique.add(normalized);
  }

  return Array.from(unique);
}

async function resolveCanonicalTagByNormalized(normalizedName: string) {
  const builtInCanonical = BUILT_IN_ALIASES[normalizedName];

  const [dbAlias] = await db
    .select({ canonicalTagId: tagAliases.canonicalTagId })
    .from(tagAliases)
    .where(eq(tagAliases.normalizedAlias, normalizedName))
    .limit(1);

  if (dbAlias?.canonicalTagId) {
    const [canonicalTag] = await db
      .select()
      .from(tags)
      .where(eq(tags.id, dbAlias.canonicalTagId))
      .limit(1);
    return canonicalTag;
  }

  if (builtInCanonical) {
    const [canonicalTag] = await db
      .select()
      .from(tags)
      .where(eq(tags.normalizedName, builtInCanonical))
      .limit(1);
    if (canonicalTag) return canonicalTag;
  }

  const [tag] = await db
    .select()
    .from(tags)
    .where(eq(tags.normalizedName, normalizedName))
    .limit(1);
  return tag;
}

export async function upsertTag(input: Pick<InsertTag, "name" | "description">) {
  const normalizedName = normalizeTagName(input.name);
  if (!normalizedName) {
    throw new Error("Tag name is required");
  }

  const existing = await resolveCanonicalTagByNormalized(normalizedName);
  if (existing) return existing;

  const [created] = await db
    .insert(tags)
    .values({
      name: input.name.trim(),
      normalizedName,
      description: input.description ?? null,
    })
    .onConflictDoUpdate({
      target: tags.normalizedName,
      set: { name: input.name.trim(), description: input.description ?? null },
    })
    .returning();

  return created;
}

export async function upsertTagAlias(alias: string, canonicalTagId: string) {
  const normalizedAlias = normalizeTagName(alias);
  if (!normalizedAlias) {
    throw new Error("Alias is required");
  }

  await db
    .insert(tagAliases)
    .values({ alias: alias.trim(), normalizedAlias, canonicalTagId })
    .onConflictDoUpdate({
      target: tagAliases.normalizedAlias,
      set: { canonicalTagId, alias: alias.trim() },
    });
}

export async function setUserTagWeights(
  userId: string,
  tagWeights: Array<{ tag: string; weight: number }>,
): Promise<void> {
  if (!userId) throw new Error("userId is required");

  const deduped = new Map<string, number>();
  for (const item of tagWeights) {
    const normalized = normalizeTagName(item.tag);
    if (!normalized) continue;
    const weight = Number.isFinite(item.weight) ? Math.max(0, Math.round(item.weight)) : 0;
    if (weight === 0) continue;
    deduped.set(normalized, weight);
  }

  const normalizedTags = Array.from(deduped.keys());
  if (normalizedTags.length === 0) {
    await db.delete(userTags).where(eq(userTags.userId, userId));
    return;
  }

  const canonicalTags = await Promise.all(
    normalizedTags.map(async (normalized) => {
      const existing = await resolveCanonicalTagByNormalized(normalized);
      if (existing) return existing;
      return upsertTag({ name: normalized });
    }),
  );

  await db.delete(userTags).where(eq(userTags.userId, userId));

  await db.insert(userTags).values(
    canonicalTags.map((tag) => ({
      userId,
      tagId: tag.id,
      weight: deduped.get(tag.normalizedName) ?? 1,
    })),
  );
}

export async function setOpportunityTagWeights(
  opportunityId: string,
  tagWeights: Array<{ tag: string; weight: number }>,
): Promise<void> {
  if (!opportunityId) throw new Error("opportunityId is required");

  const deduped = new Map<string, number>();
  for (const item of tagWeights) {
    const normalized = normalizeTagName(item.tag);
    if (!normalized) continue;
    const weight = Number.isFinite(item.weight) ? Math.max(0, Math.round(item.weight)) : 0;
    if (weight === 0) continue;
    deduped.set(normalized, weight);
  }

  const normalizedTags = Array.from(deduped.keys());
  if (normalizedTags.length === 0) {
    await db.delete(opportunityTags).where(eq(opportunityTags.opportunityId, opportunityId));
    return;
  }

  const canonicalTags = await Promise.all(
    normalizedTags.map(async (normalized) => {
      const existing = await resolveCanonicalTagByNormalized(normalized);
      if (existing) return existing;
      return upsertTag({ name: normalized });
    }),
  );

  await db.delete(opportunityTags).where(eq(opportunityTags.opportunityId, opportunityId));

  await db.insert(opportunityTags).values(
    canonicalTags.map((tag) => ({
      opportunityId,
      tagId: tag.id,
      weight: deduped.get(tag.normalizedName) ?? 1,
    })),
  );
}

export async function getUserTagVector(userId: string): Promise<TagVector> {
  const records = await db
    .select({ normalizedName: tags.normalizedName, weight: userTags.weight })
    .from(userTags)
    .innerJoin(tags, eq(userTags.tagId, tags.id))
    .where(eq(userTags.userId, userId));

  return records.reduce<TagVector>((vector, record) => {
    vector[record.normalizedName] = record.weight ?? 1;
    return vector;
  }, {});
}

export async function getOpportunityTagVector(opportunityId: string): Promise<TagVector> {
  const records = await db
    .select({ normalizedName: tags.normalizedName, weight: opportunityTags.weight })
    .from(opportunityTags)
    .innerJoin(tags, eq(opportunityTags.tagId, tags.id))
    .where(eq(opportunityTags.opportunityId, opportunityId));

  return records.reduce<TagVector>((vector, record) => {
    vector[record.normalizedName] = record.weight ?? 1;
    return vector;
  }, {});
}

export function computeTagOverlap(userVector: TagVector, opportunityVector: TagVector): number {
  const userTagsList = Object.keys(userVector);
  if (userTagsList.length === 0) return 0;

  let numerator = 0;
  let userMagnitudeSq = 0;
  let opportunityMagnitudeSq = 0;

  for (const value of Object.values(userVector)) {
    userMagnitudeSq += value * value;
  }

  for (const [tag, value] of Object.entries(opportunityVector)) {
    opportunityMagnitudeSq += value * value;
    if (tag in userVector) {
      numerator += userVector[tag] * value;
    }
  }

  if (numerator === 0 || userMagnitudeSq === 0 || opportunityMagnitudeSq === 0) return 0;

  return numerator / Math.sqrt(userMagnitudeSq * opportunityMagnitudeSq);
}
