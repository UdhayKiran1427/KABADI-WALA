import { NextRequest } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth/getAuthUser";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/apiResponse";
import { setRecyclerStatus } from "@/lib/services/adminService";

const StatusSchema = z.object({
  status: z.enum(["VERIFIED", "SUSPENDED", "EXPIRED"]),
  notes: z.string().max(500).optional(),
});

/**
 * Admin: approve (VERIFIED), suspend or expire a recycler. Only VERIFIED recyclers receive lot requests.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, response } = await requireApiUser(req, ["ADMIN"]);
    if (response) return response;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiError("INVALID_JSON", "Malformed JSON request body", 400);
    }
    const parsed = StatusSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.issues[0].message, 400);
    }

    const { id } = await params;
    await setRecyclerStatus(user.userId, id, parsed.data.status, parsed.data.notes);
    return apiSuccess({ id, status: parsed.data.status });
  } catch (err) {
    return apiErrorFrom(err);
  }
}
