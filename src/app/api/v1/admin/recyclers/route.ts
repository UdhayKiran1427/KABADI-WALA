import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth/getAuthUser";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/apiResponse";
import { createRecycler } from "@/lib/services/adminService";

const CreateRecyclerSchema = z.object({
  name: z.string().min(2),
  contactPhone: z.string().min(10),
  authorizationNo: z.string().min(2),
  authorizationValidTill: z.string().datetime().optional(),
  address: z.string().min(2),
  area: z.string().min(2),
  district: z.string().optional(),
  state: z.string().optional(),
  latitude: z.number(),
  longitude: z.number(),
  serviceRadiusKm: z.number().positive().optional(),
  staffPhone: z.string().regex(/^\d{10}$/, "Staff phone must be a 10-digit number"),
  staffPassword: z.string().min(6, "Staff password must be at least 6 characters"),
});

/**
 * Admin: list all recyclers.
 */
export async function GET(req: NextRequest) {
  try {
    const { response } = await requireApiUser(req, ["ADMIN"]);
    if (response) return response;

    const recyclers = await prisma.recycler.findMany({
      orderBy: { createdAt: "desc" },
      include: { staff: { include: { user: { select: { phone: true } } } } },
    });

    return apiSuccess({
      recyclers: recyclers.map((r) => ({
        id: r.id,
        name: r.name,
        contactPhone: r.contactPhone,
        address: r.address,
        area: r.area,
        district: r.district,
        latitude: r.latitude,
        longitude: r.longitude,
        authorizationNo: r.authorizationNo,
        authorizationStatus: r.authorizationStatus,
        authorizationValidTill: r.authorizationValidTill,
        staffPhones: r.staff.map((s) => s.user.phone),
        createdAt: r.createdAt,
      })),
    });
  } catch (err) {
    return apiErrorFrom(err);
  }
}

/**
 * Admin: add a verified recycler with one staff login (phone + password for POST /auth/staff-login).
 * Latitude/longitude decide which collectors (within 5 km) reach this recycler.
 */
export async function POST(req: NextRequest) {
  try {
    const { response } = await requireApiUser(req, ["ADMIN"]);
    if (response) return response;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiError("INVALID_JSON", "Malformed JSON request body", 400);
    }
    const parsed = CreateRecyclerSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.issues[0].message, 400);
    }

    const { authorizationValidTill, ...rest } = parsed.data;
    const recycler = await createRecycler({
      ...rest,
      authorizationValidTill: authorizationValidTill ? new Date(authorizationValidTill) : undefined,
    });

    return apiSuccess({ recycler: { id: recycler.id, name: recycler.name, authorizationStatus: recycler.authorizationStatus } }, 201);
  } catch (err) {
    return apiErrorFrom(err);
  }
}
