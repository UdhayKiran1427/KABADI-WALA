import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPin } from "@/lib/auth/password";
import { signMobileToken } from "@/lib/auth/jwt";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { generateUniqueShortCode } from "@/lib/services/collectorService";
import { z } from "zod";

const RegisterSchema = z.object({
  phone: z.string().regex(/^\d{10}$/, "Phone must be a valid 10-digit number"),
  pin: z.string().regex(/^\d{4}$/, "PIN must be a 4-digit number"),
  preferredLanguage: z.enum(["HI", "MR", "EN"]).default("HI"),
  operatingArea: z.string().min(2, "Operating area is required"),
  district: z.string().optional(),
  consent: z
    .object({
      version: z.string().default("1.0"),
      locationConsent: z.boolean().default(true),
    })
    .optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = RegisterSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.issues[0].message, 400, parsed.error.format());
    }

    const { phone, pin, preferredLanguage, operatingArea, district, consent } = parsed.data;

    // Check if phone is already registered
    const existing = await prisma.user.findUnique({ where: { phone } });
    if (existing) {
      return apiError("PHONE_ALREADY_EXISTS", "This phone number is already registered. Please sign in.", 409);
    }

    const pinHash = await hashPin(pin);
    const shortCode = await generateUniqueShortCode();

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          phone,
          pinHash,
          role: "COLLECTOR",
          language: preferredLanguage,
          isActive: true,
        },
      });

      const collector = await tx.collector.create({
        data: {
          userId: user.id,
          shortCode,
          preferredLanguage,
          operatingArea,
          district: district || null,
          consentAt: new Date(),
        },
      });

      if (consent) {
        await tx.consentRecord.create({
          data: {
            userId: user.id,
            version: consent.version,
            language: preferredLanguage,
            locationConsent: consent.locationConsent,
          },
        });
      }

      return { user, collector };
    });

    const token = await signMobileToken({
      userId: result.user.id,
      phone: result.user.phone,
      role: result.user.role,
      shortCode: result.collector.shortCode,
    });

    return apiSuccess(
      {
        token,
        profile: {
          collectorId: result.collector.id,
          userId: result.user.id,
          shortCode: result.collector.shortCode,
          preferredLanguage: result.collector.preferredLanguage,
          operatingArea: result.collector.operatingArea,
          phone: result.user.phone,
        },
      },
      201
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return apiError("INTERNAL_ERROR", errorMsg, 500);
  }
}

