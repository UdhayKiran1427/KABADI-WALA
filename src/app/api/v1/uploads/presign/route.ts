import { type NextRequest } from "next/server";
import { getAuthCollector } from "@/lib/auth/getAuthCollector";
import { apiError, apiSuccess, parseBody, apiErrorFrom } from "@/lib/apiResponse";
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

    const { body, response: bodyError } = await parseBody(req, PresignSchema);
    if (bodyError) return bodyError;

    const { filename, contentType } = body;
    const presigned = await getPresignedUploadUrl(auth.user.userId, filename, contentType);

    return apiSuccess(presigned);
  } catch (err) {
    return apiErrorFrom(err);
  }
}

