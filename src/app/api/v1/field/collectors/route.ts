import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPin } from "@/lib/auth/password";
import { verifyMobileToken } from "@/lib/auth/jwt";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { generateUniqueShortCode } from "@/lib/services/collectorService";
import { z } from "zod";

const OnboardCollectorSchema = z.object({
  phone: z.string().regex(/^\d{10}$/, "Phone must be 10 digits"),
  pin: z.string().regex(/^\d{4}$/, "PIN must be a 4-digit number"),
  preferredLanguage: z.enum(["HI", "MR", "EN"]).default("HI"),
  operatingArea: z.string().min(2),
  district: z.string().optional(),
  hasConsent: z.boolean().refine((val) => val === true, "Collector consent is mandatory"),
});

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    let agentId: string | null = null;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const payload = await verifyMobileToken(authHeader.substring(7));
      if (payload) agentId = payload.userId;
    }

    const body = await req.json();
    const parsed = OnboardCollectorSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.issues[0].message, 400);
    }

    const { phone, pin, preferredLanguage, operatingArea, district } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { phone } });
    if (existing) {
      return apiError("PHONE_EXISTS", "This phone number is already registered", 409);
    }

    const pinHash = await hashPin(pin);
    const shortCode = await generateUniqueShortCode();

    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          phone,
          pinHash,
          role: "COLLECTOR",
          language: preferredLanguage,
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
          onboardedById: agentId,
        },
      });

      await tx.consentRecord.create({
        data: {
          userId: user.id,
          version: "1.0-FIELD-AGENT",
          language: preferredLanguage,
          locationConsent: true,
        },
      });

      return { user, collector };
    });

    return apiSuccess({
      message: "Collector onboarded successfully by field agent",
      collector: {
        id: created.collector.id,
        userId: created.user.id,
        shortCode: created.collector.shortCode,
        phone: created.user.phone,
        preferredLanguage: created.collector.preferredLanguage,
        operatingArea: created.collector.operatingArea,
      },
    }, 201);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return apiError("INTERNAL_ERROR", errorMsg, 500);
  }
}

