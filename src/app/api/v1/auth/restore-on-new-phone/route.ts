import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPin } from "@/lib/auth/password";
import { signMobileToken } from "@/lib/auth/jwt";
import { apiError, apiSuccess, parseBody, apiErrorFrom } from "@/lib/apiResponse";
import { z } from "zod";

const RestoreSchema = z.object({
  phone: z.string().regex(/^\d{10}$/, "Phone must be 10 digits"),
  pin: z.string().regex(/^\d{4}$/, "PIN must be a 4-digit number"),
  deviceId: z.string().min(4, "deviceId is required"),
});

export async function POST(req: NextRequest) {
  try {
    const { body, response: bodyError } = await parseBody(req, RestoreSchema);
    if (bodyError) return bodyError;

    const { phone, pin, deviceId } = body;

    const user = await prisma.user.findUnique({
      where: { phone },
      include: { collector: true },
    });

    if (!user || !user.collector || !user.isActive) {
      return apiError("INVALID_CREDENTIALS", "Invalid phone number or PIN", 401);
    }

    const isValid = await verifyPin(pin, user.pinHash);
    if (!isValid) {
      return apiError("INVALID_CREDENTIALS", "Invalid phone number or PIN", 401);
    }

    // Determine current lot counter from existing lots count
    const totalLots = await prisma.lot.count({
      where: { collectorId: user.collector.id },
    });

    // Record DeviceRestore entry
    await prisma.deviceRestore.create({
      data: {
        userId: user.id,
        deviceId,
        restoreCode: `RESTORE-${Date.now().toString().slice(-6)}`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        usedAt: new Date(),
      },
    });

    const token = await signMobileToken({
      userId: user.id,
      phone: user.phone,
      role: user.role,
      shortCode: user.collector.shortCode,
    });

    return apiSuccess({
      token,
      profile: {
        collectorId: user.collector.id,
        userId: user.id,
        shortCode: user.collector.shortCode,
        preferredLanguage: user.collector.preferredLanguage,
        operatingArea: user.collector.operatingArea,
        phone: user.phone,
        lotCounter: totalLots, // Drift LocalProfile.lotCounter
      },
    });
  } catch (err) {
    return apiErrorFrom(err);
  }
}

