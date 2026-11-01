import { apiError } from "@/lib/apiResponse";

/**
 * Retired: collectors no longer pick any recycler directly.
 * Use POST /lots/{id}/confirm, GET /lots/{id}/offers and POST /lots/{id}/select instead.
 */
export async function POST() {
  return apiError(
    "ENDPOINT_RETIRED",
    "Use POST /api/v1/lots/{id}/confirm, then GET /api/v1/lots/{id}/offers and POST /api/v1/lots/{id}/select",
    410
  );
}
