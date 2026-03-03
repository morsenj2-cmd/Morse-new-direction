import assert from "node:assert/strict";
import {
  buildPrimaryRadarModule,
  ensureMinimumOpportunityCount,
  type RankedOpportunity,
} from "../opportunityService";

function ranked(id: string, mode: RankedOpportunity["matchMode"], score: number): RankedOpportunity {
  return {
    opportunity: {
      id,
      title: `Opportunity ${id}`,
      description: null,
      type: "job",
      qualityScore: 70,
      source: "test",
      createdAt: new Date(),
    },
    tagOverlap: mode === "trending" ? 0 : 0.5,
    recencyBoost: 0.7,
    qualityNormalized: 0.7,
    score,
    matchMode: mode,
  };
}

function run(): void {
  const strict = [ranked("1", "strict", 0.9), ranked("2", "strict", 0.85)];
  const soft = [ranked("2", "soft", 0.8), ranked("3", "soft", 0.75), ranked("4", "soft", 0.7)];
  const trending = [ranked("4", "trending", 0.65), ranked("5", "trending", 0.6), ranked("6", "trending", 0.55)];

  const filled = ensureMinimumOpportunityCount(strict, [...soft, ...trending], 5);
  assert.equal(filled.length, 5, "fills to requested minimum when fallback has enough items");
  assert.deepEqual(
    filled.map((item) => item.opportunity.id),
    ["1", "2", "3", "4", "5"],
    "dedupes repeated IDs while preserving strict/soft/trending order",
  );

  const primaryWithStrict = buildPrimaryRadarModule(strict, soft, trending, 4);
  assert.deepEqual(
    primaryWithStrict.map((item) => item.opportunity.id),
    ["1", "2", "3", "4"],
    "primary module prioritizes strict matches before soft/trending fallback",
  );

  const primarySoftFallback = buildPrimaryRadarModule([], soft, trending, 3);
  assert.deepEqual(
    primarySoftFallback.map((item) => item.opportunity.id),
    ["2", "3", "4"],
    "falls back to soft matches when strict set is empty",
  );

  const primaryTrendingFallback = buildPrimaryRadarModule([], [], trending, 2);
  assert.deepEqual(
    primaryTrendingFallback.map((item) => item.opportunity.id),
    ["4", "5"],
    "falls back to trending when strict and soft are empty",
  );

  console.log("opportunityService tests passed");
}

run();
