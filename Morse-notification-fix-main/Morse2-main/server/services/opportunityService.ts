export type UserTagWeight = {
  tagId: string;
  weight: number;
};

export type ScoringUser = {
  id: string;
  tags: UserTagWeight[];
  openToJobs?: boolean | null;
};

export type ScoringOpportunity = {
  id: string;
  tagIds: string[];
  type?: "job" | "freelance" | "startup" | "repo" | "news" | string | null;
  tagNames?: string[];
  title?: string | null;
  description?: string | null;
  createdAt?: Date | string | null;
  source?: string | null;
  websiteUrl?: string | null;
};

export type OpportunityScoreBreakdown = {
  skillOverlapWeight: number;
  recencyWeight: number;
  sourceQualityWeight: number;
  score: number;
};

export type PersonalizedOpportunity = ScoringOpportunity & OpportunityScoreBreakdown;

export type OpportunityPaginationCursor = {
  createdAt: Date;
  id: string;
};

export type NewSinceLastVisitOptions = {
  limit?: number;
  cursor?: OpportunityPaginationCursor;
};

export type OpportunityServiceDependencies = {
  getUserTagWeights: (userId: string) => Promise<UserTagWeight[]>;
  getAllOpportunities: () => Promise<ScoringOpportunity[]>;
  getUserLastSeenAt: (userId: string) => Promise<Date | null>;
  getOpportunitiesCreatedAfter?: (
    createdAfter: Date,
    options?: NewSinceLastVisitOptions,
  ) => Promise<ScoringOpportunity[]>;
  now?: () => Date;
};

const RECENCY_HORIZON_DAYS = 30;

export function clamp01(value: number): number {
  if (!Number.isFinite(value) || Number.isNaN(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

export function buildUserTagWeightMap(tags: UserTagWeight[]): Map<string, number> {
  const map = new Map<string, number>();

  for (const tag of tags) {
    const current = map.get(tag.tagId) ?? 0;
    const safeWeight = Math.max(0, Number(tag.weight) || 0);
    map.set(tag.tagId, current + safeWeight);
  }

  return map;
}

export function calculateSkillOverlapWeight(userTags: UserTagWeight[], opportunityTagIds: string[]): number {
  const userTagWeights = buildUserTagWeightMap(userTags);
  const denominator = Array.from(userTagWeights.values()).reduce((sum, weight) => sum + weight, 0);

  if (denominator <= 0) return 0;

  const uniqueOpportunityTagIds = Array.from(new Set(opportunityTagIds));
  const numerator = uniqueOpportunityTagIds.reduce((sum, tagId) => sum + (userTagWeights.get(tagId) ?? 0), 0);

  return clamp01(numerator / denominator);
}

export function calculateRecencyWeight(createdAt?: Date | string | null, now: Date = new Date()): number {
  if (!createdAt) return 0;

  const parsedDate = createdAt instanceof Date ? createdAt : new Date(createdAt);
  if (Number.isNaN(parsedDate.getTime())) return 0;

  const ageMs = Math.max(0, now.getTime() - parsedDate.getTime());
  const horizonMs = RECENCY_HORIZON_DAYS * 24 * 60 * 60 * 1000;
  return clamp01(1 - ageMs / horizonMs);
}

export function calculateSourceQualityWeight(source?: string | null, websiteUrl?: string | null): number {
  const sourceKey = String(source ?? "").trim().toLowerCase();

  if (sourceKey === "github") return 1;
  if (sourceKey === "curated") return 0.9;
  if (sourceKey === "community") return 0.7;
  if (sourceKey === "news") return 0.6;

  const url = String(websiteUrl ?? "").trim().toLowerCase();
  if (!url) return 0.4;
  if (url.includes("github.com")) return 1;
  if (url.includes("gitlab.com") || url.includes("bitbucket.org")) return 0.9;
  if (url.startsWith("https://")) return 0.7;
  return 0.5;
}



export function inferOpportunityCategory(opportunity: ScoringOpportunity): "job" | "freelance" | "startup" | "repo" | "news" | "other" {
  const explicit = String(opportunity.type ?? "").toLowerCase().trim();
  if (["job", "freelance", "startup", "repo", "news"].includes(explicit)) {
    return explicit as "job" | "freelance" | "startup" | "repo" | "news";
  }

  const haystack = [
    ...(opportunity.tagNames ?? []),
    opportunity.title ?? "",
    opportunity.description ?? "",
    explicit,
  ]
    .join(" ")
    .toLowerCase();

  if (/(full[-\s]?time|job\b|hiring|position|role\b)/.test(haystack)) return "job";
  if (/(freelance|contract|gig|consult)/.test(haystack)) return "freelance";
  if (/(startup|founder|mvp|saas|pre[-\s]?seed|seed\s?round)/.test(haystack)) return "startup";
  if (/(repo\b|github|open[ -]?source|oss\b)/.test(haystack)) return "repo";
  if (/(market\s?signal|trend|news|funding|acqui|layoff)/.test(haystack)) return "news";

  return "other";
}

export function getOpenToJobsPreferenceMultiplier(user: ScoringUser, opportunity: ScoringOpportunity): number {
  if (user.openToJobs !== false) return 1;

  const category = inferOpportunityCategory(opportunity);
  if (category === "job") return 0.6;
  if (category === "freelance") return 1.2;
  if (category === "startup") return 1.15;
  if (category === "repo") return 1.1;
  if (category === "news") return 1.1;
  return 1.05;
}

export function scoreOpportunityForUser(user: ScoringUser, opportunity: ScoringOpportunity, now: Date = new Date()): OpportunityScoreBreakdown {
  const skillOverlapWeight = calculateSkillOverlapWeight(user.tags, opportunity.tagIds);
  const recencyWeight = calculateRecencyWeight(opportunity.createdAt, now);
  const sourceQualityWeight = calculateSourceQualityWeight(opportunity.source, opportunity.websiteUrl);

  // Deterministic normalized blend of the three factors with preference adjustment.
  const baseScore = clamp01((skillOverlapWeight + recencyWeight + sourceQualityWeight) / 3);
  const preferenceMultiplier = getOpenToJobsPreferenceMultiplier(user, opportunity);
  const score = clamp01(baseScore * preferenceMultiplier);

  return {
    skillOverlapWeight,
    recencyWeight,
    sourceQualityWeight,
    score,
  };
}


export async function getPersonalizedOpportunities(
  userId: string,
  limit: number,
  deps: OpportunityServiceDependencies,
): Promise<PersonalizedOpportunity[]> {
  const nowProvider = deps.now ?? (() => new Date());
  const [userTags, opportunities] = await Promise.all([
    deps.getUserTagWeights(userId),
    deps.getAllOpportunities(),
  ]);

  const scoringUser: ScoringUser = {
    id: userId,
    tags: userTags,
  };

  const scored = opportunities
    .map((opportunity) => {
      const breakdown = scoreOpportunityForUser(scoringUser, opportunity, nowProvider());
      return {
        ...opportunity,
        ...breakdown,
      };
    })
    .sort((a, b) =>
      b.score - a.score ||
      new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime() ||
      a.id.localeCompare(b.id)
    );

  return scored.slice(0, Math.max(0, limit));
}

export async function getNewSinceLastVisit(
  userId: string,
  deps: OpportunityServiceDependencies,
  options: NewSinceLastVisitOptions = {},
): Promise<ScoringOpportunity[]> {
  const lastSeenAt = await deps.getUserLastSeenAt(userId);

  // New users (null last_seen_at) should not get an empty response.
  if (!lastSeenAt) {
    const all = await deps.getAllOpportunities();
    return all
      .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
      .slice(0, options.limit ?? 20);
  }

  if (deps.getOpportunitiesCreatedAfter) {
    return deps.getOpportunitiesCreatedAfter(lastSeenAt, options);
  }

  // Backward-compatible fallback for environments without indexed query dependency.
  const opportunities = await deps.getAllOpportunities();
  const boundaryTime = lastSeenAt.getTime();
  const filtered = opportunities
    .filter((opportunity) => {
      if (!opportunity.createdAt) return false;
      const createdAt = new Date(opportunity.createdAt);
      if (Number.isNaN(createdAt.getTime())) return false;
      return createdAt.getTime() > boundaryTime;
    })
    .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());

  return filtered.slice(0, options.limit ?? 20);
}

export function createOpportunityService(deps: OpportunityServiceDependencies) {
  return {
    getPersonalizedOpportunities: (userId: string, limit: number) => getPersonalizedOpportunities(userId, limit, deps),
    getNewSinceLastVisit: (userId: string) => getNewSinceLastVisit(userId, deps),
    scoreOpportunityForUser,
  };
}
