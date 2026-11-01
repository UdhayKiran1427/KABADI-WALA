import { type NextRequest } from "next/server";
import { apiError } from "@/lib/apiResponse";
import { buildSpec, isSpecSlug, SPEC_SLUGS } from "@/lib/openapi";

/**
 * GET /api/docs/{collector|recycler|admin|field-agent|all}
 * Returns the OpenAPI 3.0 document for that role (importable into Postman / Insomnia).
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;
  const slug = role.replace(/\.json$/, "").toLowerCase();

  if (!isSpecSlug(slug)) {
    return apiError("NOT_FOUND", `Unknown role "${role}". Use one of: ${SPEC_SLUGS.join(", ")}`, 404);
  }

  return Response.json(buildSpec(slug), {
    headers: { "Cache-Control": "no-store" },
  });
}
