import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPin } from "@/lib/auth/password";
import { getAuthUser } from "@/lib/auth/getAuthUser";
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

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth || (auth.role !== "FIELD_AGENT" && auth.role !== "ADMIN")) {
      return apiError("UNAUTHORIZED", "Field agent or admin authorization required", 401);
    }

    const where: any = {};
    if (auth.role === "FIELD_AGENT") {
      where.onboardedById = auth.userId;
    }

    const collectors = await prisma.collector.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        user: { select: { phone: true, createdAt: true, isActive: true } },
        _count: { select: { lots: true } },
      },
    });

    return apiSuccess({
      count: collectors.length,
      collectors: collectors.map((c) => ({
        id: c.id,
        shortCode: c.shortCode,
        phone: c.user.phone,
        operatingArea: c.operatingArea,
        district: c.district,
        preferredLanguage: c.preferredLanguage,
        totalLots: c._count.lots,
        createdAt: c.createdAt,
      })),
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return apiError("INTERNAL_ERROR", errorMsg, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    let agentId: string | null = auth?.userId || null;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiError("INVALID_JSON", "Malformed JSON request body", 400);
    }
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

