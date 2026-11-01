import { NextRequest } from "next/server";
import { assertReplicaSetHealth } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/apiResponse";

export async function GET(req: NextRequest) {
  try {
    const dbHealth = await assertReplicaSetHealth();

    if (!dbHealth.ok) {
      return apiError(
        "DATABASE_HEALTH_FAILED",
        dbHealth.message,
        503,
        { replicaSetRequired: true }
      );
    }

    return apiSuccess({
      status: "UP",
      timestamp: new Date().toISOString(),
      database: dbHealth.message,
      environment: process.env.NODE_ENV || "development",
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return apiError("HEALTH_CHECK_FAILED", errorMsg, 503);
  }
}

