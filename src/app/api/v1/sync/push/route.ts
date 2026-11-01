import { NextRequest } from "next/server";
import { getAuthCollector } from "@/lib/auth/getAuthCollector";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { sortMutations, processMutation, SyncMutationInput } from "@/lib/services/syncEngine";
import { z } from "zod";

const PushMutationSchema = z.object({
  clientMutationId: z.string().min(1),
  entity: z.string().min(1),
  entityId: z.string().min(1),
  op: z.enum(["create", "update"]),
  payload: z.record(z.any()),
  clientTimestamp: z.string(),
});

const PushPayloadSchema = z.object({
  deviceId: z.string().min(1),
  mutations: z.array(PushMutationSchema).max(100),
});

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthCollector(req);
    if (!auth) {
      return apiError("UNAUTHORIZED", "Missing or invalid bearer authorization", 401);
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiError("INVALID_JSON", "Malformed JSON request body", 400);
    }
    const parsed = PushPayloadSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.issues[0].message, 400);
    }

    const { deviceId, mutations } = parsed.data;

    // 1. Sort mutations: parents first, creates before updates, clientTimestamp ascending
    const sorted = sortMutations(mutations as SyncMutationInput[]);

    // 2. Process each mutation in its own transaction
    const results = [];
    for (const mutation of sorted) {
      const res = await processMutation(mutation, auth.user.userId, deviceId);
      results.push(res);
    }

    return apiSuccess({
      deviceId,
      totalMutations: mutations.length,
      results,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return apiError("INTERNAL_ERROR", errorMsg, 500);
  }
}

