import { type NextRequest } from "next/server";
import { z } from "zod";
import { getAuthSyncActor } from "@/lib/auth/getAuthSyncActor";
import { apiError, apiErrorFrom, apiSuccess, parseBody } from "@/lib/apiResponse";
import { processMutation, sortMutations, type SyncActorContext, type SyncMutationInput, type SyncMutationResult } from "@/lib/services/syncEngine";
import { PushMutationSchema } from "@/lib/contract/syncContract";

/** The envelope is validated here; each mutation is validated on its own so one bad row cannot fail the batch. */
const PushEnvelopeSchema = z.object({
  deviceId: z.string().min(1),
  mutations: z.array(z.unknown()).max(100),
});

function clientMutationIdOf(item: unknown): string {
  if (item && typeof item === "object" && typeof (item as { clientMutationId?: unknown }).clientMutationId === "string") {
    return (item as { clientMutationId: string }).clientMutationId;
  }
  return "";
}

export async function POST(req: NextRequest) {
  try {
    const actor = await getAuthSyncActor(req);
    if (!actor) {
      return apiError("UNAUTHORIZED", "Missing or invalid bearer authorization", 401);
    }

    const { body, response: bodyError } = await parseBody(req, PushEnvelopeSchema);
    if (bodyError) return bodyError;
    const { deviceId, mutations: rawItems } = body;

    const ctx: SyncActorContext = { userId: actor.userId, role: actor.role, collector: actor.collector, deviceId };

    // Per-item validation: a malformed item becomes a non-retryable REJECTED result in its own slot.
    const resultsByIndex: Array<SyncMutationResult | undefined> = new Array(rawItems.length).fill(undefined);
    const valid: Array<{ index: number; mutation: SyncMutationInput }> = [];
    rawItems.forEach((item, index) => {
      const parsed = PushMutationSchema.safeParse(item);
      if (parsed.success) {
        valid.push({ index, mutation: parsed.data as SyncMutationInput });
      } else {
        const issue = parsed.error.issues[0];
        resultsByIndex[index] = {
          clientMutationId: clientMutationIdOf(item),
          status: "REJECTED",
          code: "INVALID_PAYLOAD",
          message: `${issue.path.join(".") || "mutation"}: ${issue.message}`,
          retryable: false,
        };
      }
    });

    // Parents first, creates before updates, then by clientTimestamp; answers go back in request order.
    const indexOf = new Map(valid.map((v) => [v.mutation, v.index]));
    for (const mutation of sortMutations(valid.map((v) => v.mutation))) {
      resultsByIndex[indexOf.get(mutation) as number] = await processMutation(mutation, ctx);
    }

    return apiSuccess({
      deviceId,
      serverTimestamp: new Date().toISOString(),
      totalMutations: rawItems.length,
      results: resultsByIndex as SyncMutationResult[],
    });
  } catch (err) {
    return apiErrorFrom(err);
  }
}
