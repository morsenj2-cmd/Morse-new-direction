import { and, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { opportunityTags, userOpportunityActions, userTags } from "@shared/schema";

export type OpportunityActionType = "save" | "apply" | "view" | "dismiss";

const MIN_WEIGHT = 0.1;
const MAX_WEIGHT = 5.0;

const ACTION_DELTA: Record<OpportunityActionType, number> = {
  save: 0.12,
  apply: 0.2,
  view: 0.05,
  dismiss: -0.08,
};

function clampDelta(actionType: OpportunityActionType): number {
  return ACTION_DELTA[actionType] ?? 0;
}

export async function updateUserTagWeights(userId: string, opportunityId: string, actionType: OpportunityActionType): Promise<void> {
  const [existing] = await db
    .select({ id: userOpportunityActions.id })
    .from(userOpportunityActions)
    .where(and(
      eq(userOpportunityActions.userId, userId),
      eq(userOpportunityActions.opportunityId, opportunityId),
      eq(userOpportunityActions.actionType, actionType),
    ));

  // Keep it idempotent per user+opportunity+action.
  if (existing) return;

  await db.insert(userOpportunityActions).values({
    userId,
    opportunityId,
    actionType,
  });

  const delta = clampDelta(actionType);
  if (delta === 0) return;

  await db.execute(sql`
    UPDATE user_tags ut
    SET
      weight = LEAST(${MAX_WEIGHT}, GREATEST(${MIN_WEIGHT}, COALESCE(ut.weight, 1.0) + ${delta}))
    WHERE ut.user_id = ${userId}
      AND ut.tag_id IN (
        SELECT ot.tag_id
        FROM opportunity_tags ot
        WHERE ot.opportunity_id = ${opportunityId}
      )
  `);
}
