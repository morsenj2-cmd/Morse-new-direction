import type { Tag } from "@shared/schema";
import { storage } from "../storage";

export type OpportunityTaggingInput = {
  title?: string | null;
  description?: string | null;
  type?: string | null;
  repoLanguage?: string | null;
};

type RuleDefinition = {
  tagName: string;
  keywords: string[];
};

const KEYWORD_RULES: RuleDefinition[] = [
  { tagName: "ai", keywords: ["ai", "artificial intelligence", "llm", "gpt", "genai", "machine learning"] },
  { tagName: "fintech", keywords: ["fintech", "payments", "wallet", "upi", "banking"] },
  { tagName: "saas", keywords: ["saas", "subscription", "b2b software"] },
  { tagName: "e-commerce", keywords: ["ecommerce", "e-commerce", "marketplace", "storefront"] },
  { tagName: "devops", keywords: ["devops", "kubernetes", "docker", "ci/cd", "infra"] },
  { tagName: "cybersecurity", keywords: ["security", "cybersecurity", "vulnerability", "zero trust"] },
  { tagName: "blockchain", keywords: ["blockchain", "web3", "smart contract", "crypto"] },
  { tagName: "mobile", keywords: ["android", "ios", "mobile app", "react native", "flutter"] },
  { tagName: "frontend", keywords: ["frontend", "ui", "ux", "react", "next.js"] },
  { tagName: "backend", keywords: ["backend", "api", "microservice", "server"] },
  { tagName: "data", keywords: ["data", "analytics", "etl", "warehouse", "bi"] },
  { tagName: "cloud", keywords: ["cloud", "aws", "gcp", "azure", "serverless"] },
  { tagName: "open-source", keywords: ["open source", "oss", "github"] },
];

const TYPE_TO_TAGS: Record<string, string[]> = {
  internship: ["internship"],
  fulltime: ["jobs"],
  "full-time": ["jobs"],
  contract: ["freelance"],
  freelance: ["freelance"],
  collaboration: ["collab"],
  project: ["collab"],
  launch: ["startups"],
};

const LANGUAGE_TO_TAG: Record<string, string> = {
  javascript: "javascript",
  typescript: "typescript",
  python: "python",
  go: "golang",
  golang: "golang",
  rust: "rust",
  java: "java",
  kotlin: "kotlin",
  swift: "swift",
  ruby: "ruby",
  php: "php",
};

function normalize(value?: string | null): string {
  return String(value || "").toLowerCase().trim();
}

function addScore(map: Map<string, number>, tag: string, score: number) {
  map.set(tag, (map.get(tag) || 0) + score);
}

export async function tagOpportunity(opportunity: OpportunityTaggingInput): Promise<Tag[]> {
  const existingTags = await storage.getTags();
  const existingByName = new Map(existingTags.map((t) => [normalize(t.name), t]));

  const haystack = [opportunity.title, opportunity.description, opportunity.type, opportunity.repoLanguage]
    .map((s) => normalize(s))
    .join(" ");

  const scores = new Map<string, number>();

  for (const rule of KEYWORD_RULES) {
    for (const keyword of rule.keywords) {
      if (haystack.includes(normalize(keyword))) {
        addScore(scores, normalize(rule.tagName), 1);
      }
    }
  }

  const opportunityType = normalize(opportunity.type);
  for (const tagName of TYPE_TO_TAGS[opportunityType] || []) {
    addScore(scores, normalize(tagName), 2);
  }

  const languageTag = LANGUAGE_TO_TAG[normalize(opportunity.repoLanguage)];
  if (languageTag) {
    addScore(scores, normalize(languageTag), 2);
  }

  const selected: Tag[] = [];

  for (const [tagName, score] of scores.entries()) {
    const existing = existingByName.get(tagName);
    if (existing) {
      selected.push(existing);
      continue;
    }

    if (score >= 3) {
      const created = await storage.createTag({ name: tagName, category: "auto", description: null });
      existingByName.set(tagName, created);
      selected.push(created);
    }
  }

  const deduped = new Map<string, Tag>();
  for (const tag of selected) {
    deduped.set(tag.id, tag);
  }

  return Array.from(deduped.values());
}
