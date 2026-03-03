import { desc, eq, gte, sql } from "drizzle-orm";
import { db } from "../db";
import {
  opportunities,
  type Opportunity,
  type OpportunityType,
} from "@shared/schema";
import {
  computeTagOverlap,
  getOpportunityTagVector,
  getUserTagVector,
  type TagVector,
  setOpportunityTagWeights,
} from "./tagIntelligence";

const ALLOWED_TYPES: OpportunityType[] = ["job", "freelance", "startup", "repo", "tool"];
const RANK_CACHE_TTL_MS = 2 * 60 * 1000;
const MIN_ITEMS_PER_MODULE = 10;

export type CreateOpportunityInput = {
  title: string;
  description?: string;
  type: OpportunityType;
  source: string;
  qualityScore?: number;
};

export type RankedOpportunity = {
  opportunity: Opportunity;
  tagOverlap: number;
  recencyBoost: number;
  qualityNormalized: number;
  score: number;
  matchMode: "strict" | "soft" | "trending";
};

export type RadarHomeModules = {
  primary: RankedOpportunity[];
  strict: RankedOpportunity[];
  soft: RankedOpportunity[];
  trending: RankedOpportunity[];
  newSinceLastVisit: Opportunity[];
};

type RankCacheEntry = {
  expiresAt: number;
  result: RankedOpportunity[];
};

const rankingCache = new Map<string, RankCacheEntry>();
const lastRadarVisit = new Map<string, Date>();

function assertOpportunityType(value: string): asserts value is OpportunityType {
  if (!ALLOWED_TYPES.includes(value as OpportunityType)) {
    throw new Error(`Invalid opportunity type: ${value}`);
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getSharedTagCount(userVector: TagVector, opportunityVector: TagVector): number {
  let count = 0;
  for (const key of Object.keys(opportunityVector)) {
    if (key in userVector) count += 1;
  }
  return count;
}

function toRecencyBoost(createdAt: Date | null): number {
  if (!createdAt) return 0;

  const ageHours = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
  return clamp(1 - ageHours / 168, 0, 1);
}

function toQualityNormalized(qualityScore: number | null): number {
  return clamp((qualityScore ?? 0) / 100, 0, 1);
}

function scoreOpportunity(tagOverlap: number, recencyBoost: number, qualityNormalized: number): number {
  return tagOverlap * 0.6 + recencyBoost * 0.25 + qualityNormalized * 0.15;
}

type ScoredOpportunity = {
  opportunity: Opportunity;
  tagOverlap: number;
  sharedTagCount: number;
  recencyBoost: number;
  qualityNormalized: number;
  score: number;
};

function toRankedOpportunity(item: ScoredOpportunity, matchMode: RankedOpportunity["matchMode"]): RankedOpportunity {
  return {
    opportunity: item.opportunity,
    tagOverlap: item.tagOverlap,
    recencyBoost: item.recencyBoost,
    qualityNormalized: item.qualityNormalized,
    score: item.score,
    matchMode,
  };
}

export function ensureMinimumOpportunityCount<T extends { opportunity: Opportunity }>(
  preferred: T[],
  fallback: T[],
  minimum: number,
): T[] {
  const result: T[] = [];
  const seen = new Set<string>();

  for (const item of preferred) {
    if (seen.has(item.opportunity.id)) continue;
    seen.add(item.opportunity.id);
    result.push(item);
    if (result.length >= minimum) return result;
  }

  for (const item of fallback) {
    if (seen.has(item.opportunity.id)) continue;
    seen.add(item.opportunity.id);
    result.push(item);
    if (result.length >= minimum) break;
  }

  return result;
}


export function buildPrimaryRadarModule(
  strict: RankedOpportunity[],
  soft: RankedOpportunity[],
  trending: RankedOpportunity[],
  minimum: number,
): RankedOpportunity[] {
  if (strict.length > 0) {
    return ensureMinimumOpportunityCount(strict, [...soft, ...trending], minimum);
  }

  if (soft.length > 0) {
    return ensureMinimumOpportunityCount(soft, trending, minimum);
  }

  return ensureMinimumOpportunityCount(trending, [], minimum);
}
function ensureMinimumOpportunities(preferred: Opportunity[], fallback: Opportunity[], minimum: number): Opportunity[] {
  const result: Opportunity[] = [];
  const seen = new Set<string>();

  for (const item of preferred) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    result.push(item);
    if (result.length >= minimum) return result;
  }

  for (const item of fallback) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    result.push(item);
    if (result.length >= minimum) break;
  }

  return result;
}

async function buildTrendingRanked(limit: number): Promise<RankedOpportunity[]> {
  const trending = await getGlobalTrendingOpportunities(limit);
  return trending.map((opportunity) => {
    const recencyBoost = toRecencyBoost(opportunity.createdAt ?? null);
    const qualityNormalized = toQualityNormalized(opportunity.qualityScore ?? 0);
    return {
      opportunity,
      tagOverlap: 0,
      recencyBoost,
      qualityNormalized,
      score: scoreOpportunity(0, recencyBoost, qualityNormalized),
      matchMode: "trending" as const,
    };
  });
}

async function scoreAllOpportunitiesForUser(userId: string): Promise<ScoredOpportunity[]> {
  await seedRadarOpportunitiesIfEmpty();

  const userVector = await getUserTagVector(userId);
  const allOpportunities = await db
    .select()
    .from(opportunities)
    .orderBy(desc(opportunities.createdAt))
    .limit(400);

  return Promise.all(
    allOpportunities.map(async (opportunity) => {
      const opportunityVector = await getOpportunityTagVector(opportunity.id);
      const tagOverlap = computeTagOverlap(userVector, opportunityVector);
      const sharedTagCount = getSharedTagCount(userVector, opportunityVector);
      const recencyBoost = toRecencyBoost(opportunity.createdAt ?? null);
      const qualityNormalized = toQualityNormalized(opportunity.qualityScore ?? 0);
      const score = scoreOpportunity(tagOverlap, recencyBoost, qualityNormalized);

      return {
        opportunity,
        tagOverlap,
        sharedTagCount,
        recencyBoost,
        qualityNormalized,
        score,
      };
    }),
  );
}

export async function autoTagOpportunity(_opportunity: Opportunity): Promise<Array<{ tag: string; weight: number }>> {
  return [];
}

export async function createOpportunity(input: CreateOpportunityInput): Promise<Opportunity> {
  const title = input.title?.trim();
  const source = input.source?.trim();

  if (!title) throw new Error("Opportunity title is required");
  if (!source) throw new Error("Opportunity source is required");

  assertOpportunityType(input.type);

  const [created] = await db
    .insert(opportunities)
    .values({
      title,
      description: input.description?.trim() || null,
      type: input.type,
      source,
      qualityScore: Math.max(0, Math.round(input.qualityScore ?? 0)),
    })
    .returning();

  const inferredTags = await autoTagOpportunity(created);
  if (inferredTags.length > 0) {
    await setOpportunityTagWeights(created.id, inferredTags);
  }

  return created;
}

export async function seedRadarOpportunitiesIfEmpty(): Promise<void> {
  const [existing] = await db.select({ count: sql<number>`count(*)::int` }).from(opportunities);
  if ((existing?.count ?? 0) > 0) return;

  const seedData: CreateOpportunityInput[] = [
    { title: "Founding Engineer (AI Tools)", description: "Early-stage startup hiring full-stack + LLM engineer.", type: "job", source: "morse-seed", qualityScore: 78 },
    { title: "Open Source Growth Automation Repo", description: "High-signal OSS repo for growth and GTM automation.", type: "repo", source: "morse-seed", qualityScore: 71 },
    { title: "Product Designer for SaaS MVP Sprint", description: "Freelance sprint for B2B SaaS onboarding and conversion UX.", type: "freelance", source: "morse-seed", qualityScore: 69 },
    { title: "Startup Co-founder Match", description: "Find technical co-founders for fintech ideas.", type: "startup", source: "morse-seed", qualityScore: 73 },
    { title: "Growth Tool Stack", description: "Curated growth tools for early SaaS teams.", type: "tool", source: "morse-seed", qualityScore: 65 },
    { title: "Backend Freelancer Pool", description: "Contract backend engineers available immediately.", type: "freelance", source: "morse-seed", qualityScore: 66 },
    { title: "Hiring: Product Analyst", description: "Data-driven product analyst role in B2B startup.", type: "job", source: "morse-seed", qualityScore: 67 },
    { title: "Open Source DevRel Repo", description: "Community playbooks and DevRel templates.", type: "repo", source: "morse-seed", qualityScore: 62 },
    { title: "Early-stage GTM Playbook", description: "Tooling and templates for first 100 customers.", type: "tool", source: "morse-seed", qualityScore: 64 },
    { title: "India Startup Fellowship", description: "Startup builder fellowship with weekly mentors.", type: "startup", source: "morse-seed", qualityScore: 70 },
  ];

  for (const seed of seedData) {
    await createOpportunity(seed);
  }
}

export async function getGlobalTrendingOpportunities(limit = 20): Promise<Opportunity[]> {
  return db
    .select()
    .from(opportunities)
    .orderBy(desc(opportunities.qualityScore), desc(opportunities.createdAt))
    .limit(limit);
}

export async function getRecentOpportunities(hours = 72, limit = 50): Promise<Opportunity[]> {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  return db
    .select()
    .from(opportunities)
    .where(gte(opportunities.createdAt, since))
    .orderBy(desc(opportunities.createdAt))
    .limit(limit);
}

export async function getOpportunitiesByType(type: OpportunityType, limit = 50): Promise<Opportunity[]> {
  assertOpportunityType(type);
  return db
    .select()
    .from(opportunities)
    .where(eq(opportunities.type, type))
    .orderBy(desc(opportunities.createdAt))
    .limit(limit);
}

export async function getNewOpportunitiesSinceLastVisit(
  userId: string,
  options?: { since?: Date; limit?: number },
): Promise<Opportunity[]> {
  const minimum = Math.max(options?.limit ?? MIN_ITEMS_PER_MODULE, MIN_ITEMS_PER_MODULE);
  const since = options?.since ?? lastRadarVisit.get(userId) ?? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const fresh = await db
    .select()
    .from(opportunities)
    .where(gte(opportunities.createdAt, since))
    .orderBy(desc(opportunities.createdAt))
    .limit(minimum);

  const fallbackRecent = await getRecentOpportunities(72, minimum);
  const fallbackTrending = await getGlobalTrendingOpportunities(minimum);

  const merged = ensureMinimumOpportunities(fresh, ensureMinimumOpportunities(fallbackRecent, fallbackTrending, minimum), minimum);

  lastRadarVisit.set(userId, new Date());
  return merged;
}

export async function rankOpportunitiesForUser(userId: string, limit = MIN_ITEMS_PER_MODULE): Promise<RankedOpportunity[]> {
  const normalizedLimit = Math.max(limit, MIN_ITEMS_PER_MODULE);
  const cacheKey = `${userId}:${normalizedLimit}`;
  const cached = rankingCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.result;
  }

  const scored = await scoreAllOpportunitiesForUser(userId);

  const strictMatches = scored
    .filter((item) => item.sharedTagCount >= 2 && item.tagOverlap > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => toRankedOpportunity(item, "strict"));

  const softMatches = scored
    .filter((item) => item.tagOverlap > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => toRankedOpportunity(item, "soft"));

  const trendingMatches = await buildTrendingRanked(normalizedLimit * 2);

  // Required fallback order: strict -> soft -> trending
  const primary = buildPrimaryRadarModule(strictMatches, softMatches, trendingMatches, normalizedLimit);

  const guaranteedPrimary = primary.length > 0
    ? primary
    : ensureMinimumOpportunityCount(await buildTrendingRanked(normalizedLimit), [], normalizedLimit);

  rankingCache.set(cacheKey, { result: guaranteedPrimary, expiresAt: Date.now() + RANK_CACHE_TTL_MS });
  return guaranteedPrimary;
}

export async function getRadarHomeForUser(userId: string, limitPerModule = MIN_ITEMS_PER_MODULE): Promise<RadarHomeModules> {
  const minimum = Math.max(limitPerModule, MIN_ITEMS_PER_MODULE);
  const scored = await scoreAllOpportunitiesForUser(userId);

  const strict = scored
    .filter((item) => item.sharedTagCount >= 2 && item.tagOverlap > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => toRankedOpportunity(item, "strict"));

  const soft = scored
    .filter((item) => item.tagOverlap > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => toRankedOpportunity(item, "soft"));

  const trending = await buildTrendingRanked(minimum * 2);

  const primary = buildPrimaryRadarModule(strict, soft, trending, minimum);

  const strictModule = ensureMinimumOpportunityCount(strict, [...soft, ...trending], minimum);
  const softModule = ensureMinimumOpportunityCount(soft, trending, minimum);
  const trendingModule = ensureMinimumOpportunityCount(trending, [], minimum);
  const newSinceLastVisit = await getNewOpportunitiesSinceLastVisit(userId, { limit: minimum });

  return {
    primary,
    strict: strictModule,
    soft: softModule,
    trending: trendingModule,
    newSinceLastVisit,
  };
}

export function clearOpportunityRankingCache(userId?: string): void {
  if (!userId) {
    rankingCache.clear();
    return;
  }

  for (const key of rankingCache.keys()) {
    if (key.startsWith(`${userId}:`)) {
      rankingCache.delete(key);
    }
  }
}
