import { NextRequest } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth/getAuthUser";
import { apiErrorFrom, apiSuccess, parseBody } from "@/lib/apiResponse";
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

    const { body, response: bodyError } = await parseBody(req, StatusSchema);
    if (bodyError) return bodyError;

    const { id } = await params;
    await setRecyclerStatus(user.userId, id, body.status, body.notes);
    return apiSuccess({ id, status: body.status });
  } catch (err) {
    return apiErrorFrom(err);
  }
}
