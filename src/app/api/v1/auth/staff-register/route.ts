import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPin } from "@/lib/auth/password";
import { signMobileToken } from "@/lib/auth/jwt";
import { apiError, apiErrorFrom, apiSuccess, parseBody } from "@/lib/apiResponse";
import { z } from "zod";

const StaffRegisterSchema = z.object({
  name: z.string().min(2, "Name is required"),
  phone: z.string().regex(/^\d{10}$/, "Phone must be a valid 10-digit number"),
  pin: z.string().min(4, "PIN must be at least 4 digits"),
  facilityCode: z.string().min(1, "Facility code is required"),
});

/**
 * Register Recycler Staff with facility code (ROLE RB2.2 & RB2.6).
 */
export async function POST(req: NextRequest) {
  try {
    const { body, response: bodyError } = await parseBody(req, StaffRegisterSchema);
    if (bodyError) return bodyError;

    const { name, phone, pin, facilityCode } = body;

    // Check if phone already registered
    const existingUser = await prisma.user.findUnique({ where: { phone } });
    if (existingUser) {
      return apiError("PHONE_ALREADY_EXISTS", "This phone number is already registered. Please sign in.", 409);
    }

    // Match facility by id or authorizationNo
    const recycler = await prisma.recycler.findFirst({
      where: {
        OR: [
          { id: facilityCode },
          { authorizationNo: { equals: facilityCode, mode: "insensitive" } },
          { name: { contains: facilityCode, mode: "insensitive" } },
        ],
      },
    });

    if (!recycler) {
      return apiError(
        "INVALID_FACILITY_CODE",
        "No authorized recycler facility matches this facility code. Please check with your supervisor.",
        404
      );
    }

    const pinHash = await hashPin(pin);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          phone,
          pinHash,
          role: "RECYCLER",
          isActive: true,
        },
      });

      const staff = await tx.recyclerStaff.create({
        data: {
          userId: user.id,
          recyclerId: recycler.id,
        },
      });

      return { user, staff };
    });

    const token = await signMobileToken({
      userId: result.user.id,
      phone: result.user.phone,
      role: "RECYCLER",
    });

    return apiSuccess(
      {
        token,
        accountState: "PENDING_VERIFICATION",
        profile: {
          userId: result.user.id,
          phone: result.user.phone,
          name,
          role: "RECYCLER",
          facilityId: recycler.id,
          facilityName: recycler.name,
          facilityAuthorizationStatus: recycler.authorizationStatus,
        },
      },
      201
    );
  } catch (err) {
    return apiErrorFrom(err);
  }
}

