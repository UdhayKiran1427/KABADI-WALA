import { NextRequest } from "next/server";
import { getAuthCollector } from "@/lib/auth/getAuthCollector";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { getPresignedUploadUrl } from "@/lib/storage";
import { z } from "zod";

const PresignSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().default("image/jpeg"),
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
    const parsed = PresignSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.issues[0].message, 400);
    }

    const { filename, contentType } = parsed.data;
    const presigned = await getPresignedUploadUrl(auth.user.userId, filename, contentType);

    return apiSuccess(presigned);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return apiError("INTERNAL_ERROR", errorMsg, 500);
  }
}

