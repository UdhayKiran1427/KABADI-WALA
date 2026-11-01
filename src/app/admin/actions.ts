"use server";

import { prisma } from "@/lib/prisma";
import { requireRole, createSessionCookie, clearSessionCookie } from "@/lib/auth/session";
import { verifyPassword, hashPassword, hashPin } from "@/lib/auth/password";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

/**
 * Sign in for Platform Admin.
 */
export async function adminLoginAction(formData: FormData): Promise<void> {
  const phone = formData.get("phone") as string;
  const password = formData.get("password") as string;

  if (!phone || !password) {
    redirect("/admin/login?error=Phone+and+password+are+required");
  }

  const user = await prisma.user.findUnique({
    where: { phone },
  });

  if (!user || user.role !== "ADMIN" || !user.isActive) {
    redirect("/admin/login?error=Invalid+admin+credentials");
  }

  const isValid = await verifyPassword(password, user.pinHash);
  if (!isValid) {
    redirect("/admin/login?error=Invalid+admin+credentials");
  }

  await createSessionCookie({
    userId: user.id,
    phone: user.phone,
    role: "ADMIN",
  });

  redirect("/admin");
}

export async function adminLogoutAction() {
  await clearSessionCookie();
  redirect("/admin/login");
}

/**
 * M1: Approve or suspend a recycler.
 */
export async function updateRecyclerStatusAction(recyclerId: string, status: "VERIFIED" | "SUSPENDED" | "EXPIRED", notes?: string) {
  const { dbUser } = await requireRole(["ADMIN"]);

  await prisma.$transaction(async (tx) => {
    await tx.recycler.update({
      where: { id: recyclerId },
      data: {
        authorizationStatus: status,
        verifiedAt: status === "VERIFIED" ? new Date() : undefined,
        updatedAt: new Date(),
      },
    });

    await tx.recyclerVerification.create({
      data: {
        recyclerId,
        reviewedById: dbUser.id,
        status,
        notes: notes || `Admin updated status to ${status}`,
      },
    });
  });

  revalidatePath("/admin/recyclers");
  revalidatePath("/admin");
}

/**
 * M1: Add new recycler facility and staff login credentials.
 */
export async function createRecyclerAction(formData: FormData) {
  await requireRole(["ADMIN"]);

  const name = formData.get("name") as string;
  const contactPhone = formData.get("contactPhone") as string;
  const staffPhone = formData.get("staffPhone") as string;
  const staffPassword = formData.get("staffPassword") as string;
  const authorizationNo = formData.get("authorizationNo") as string;
  const validTillStr = formData.get("validTill") as string;
  const address = formData.get("address") as string;
  const area = formData.get("area") as string;
  const district = (formData.get("district") as string) || "Mumbai";
  const state = (formData.get("state") as string) || "Maharashtra";
  const latitude = parseFloat((formData.get("latitude") as string) || "19.076");
  const longitude = parseFloat((formData.get("longitude") as string) || "72.877");
  const serviceRadiusKm = parseFloat((formData.get("serviceRadiusKm") as string) || "15");

  const staffPasswordHash = await hashPassword(staffPassword || "password123");

  await prisma.$transaction(async (tx) => {
    const recycler = await tx.recycler.create({
      data: {
        name,
        contactPhone,
        address,
        area,
        district,
        state,
        latitude,
        longitude,
        authorizationNo,
        authorizationStatus: "VERIFIED",
        authorizationValidTill: validTillStr ? new Date(validTillStr) : new Date("2028-12-31"),
        serviceRadiusKm,
        verifiedAt: new Date(),
      },
    });

    const staffUser = await tx.user.create({
      data: {
        phone: staffPhone,
        pinHash: staffPasswordHash,
        role: "RECYCLER",
        language: "EN",
      },
    });

    await tx.recyclerStaff.create({
      data: {
        userId: staffUser.id,
        recyclerId: recycler.id,
      },
    });

    // Populate initial default rates for all categories
    const categories = await tx.materialCategory.findMany();
    for (const cat of categories) {
      await tx.recyclerRate.create({
        data: {
          recyclerId: recycler.id,
          categoryId: cat.id,
          ratePerKgPaise: 3500, // ₹35 default
          isCurrent: true,
        },
      });
    }
  });

  revalidatePath("/admin/recyclers");
}

/**
 * M2: Add manual spot price.
 */
export async function addPriceRecordAction(formData: FormData) {
  const { dbUser } = await requireRole(["ADMIN"]);

  const categoryId = parseInt(formData.get("categoryId") as string, 10);
  const buyingPriceRupees = parseFloat(formData.get("buyingPriceRupees") as string);
  const area = (formData.get("area") as string) || "Dharavi";
  const district = (formData.get("district") as string) || "Mumbai";
  const buyerType = (formData.get("buyerType") as string) || "SCRAP_DEALER";

  await prisma.pricePoint.create({
    data: {
      id: `PRICE-ADM-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      categoryId,
      buyingPricePaise: Math.round(buyingPriceRupees * 100),
      area,
      district,
      recordedAt: new Date(),
      source: "ADMIN",
      buyerType,
      recordedById: dbUser.id,
    },
  });

  revalidatePath("/admin/prices");
}

/**
 * M2: Delete / clean price record.
 */
export async function deletePriceRecordAction(priceId: string) {
  await requireRole(["ADMIN"]);
  await prisma.pricePoint.delete({ where: { id: priceId } });
  revalidatePath("/admin/prices");
}

/**
 * M3: Review or dismiss anomaly alert.
 */
export async function reviewAnomalyAction(flagId: string, status: "REVIEWED" | "DISMISSED") {
  const { dbUser } = await requireRole(["ADMIN"]);

  await prisma.anomalyFlag.update({
    where: { id: flagId },
    data: {
      status,
      reviewedById: dbUser.id,
      reviewedAt: new Date(),
    },
  });

  revalidatePath("/admin/anomalies");
  revalidatePath("/admin");
}

/**
 * Team Page: Create ADMIN or FIELD_AGENT user.
 */
export async function createTeamUserAction(formData: FormData) {
  await requireRole(["ADMIN"]);

  const phone = formData.get("phone") as string;
  const pin = formData.get("pin") as string;
  const role = formData.get("role") as "ADMIN" | "FIELD_AGENT";

  const pinHash = await hashPassword(pin);

  await prisma.user.create({
    data: {
      phone,
      pinHash,
      role,
      language: "EN",
    },
  });

  revalidatePath("/admin/team");
}

