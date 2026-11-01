"use server";

import { prisma } from "@/lib/prisma";
import { requireRole, createSessionCookie, clearSessionCookie } from "@/lib/auth/session";
import { writeAudit } from "@/lib/services/auditService";
import { resolveDispute, type DisputeOutcome } from "@/lib/services/disputeService";
import { verifyPassword, hashPassword, hashPin } from "@/lib/auth/password";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createRecycler, setRecyclerStatus, setTodayPrices } from "@/lib/services/adminService";
import { FlowError } from "@/lib/services/lotFlowService";

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

  await setRecyclerStatus(dbUser.id, recyclerId, status, notes);
  await writeAudit({ actorId: dbUser.id, action: "RECYCLER_STATUS_SET", entityType: "Recycler", entityId: recyclerId, details: { status, notes } });

  revalidatePath("/admin/recyclers");
  revalidatePath("/admin");
}

export async function updateRecyclerStatusFormAction(formData: FormData): Promise<void> {
  const recyclerId = formData.get("recyclerId") as string;
  const status = formData.get("status") as "VERIFIED" | "SUSPENDED" | "EXPIRED";
  const notes = (formData.get("notes") as string) || undefined;
  if (recyclerId && status) {
    await updateRecyclerStatusAction(recyclerId, status, notes);
  }
}

/**
 * M1: Add new recycler facility and staff login credentials.
 */
export async function createRecyclerAction(formData: FormData) {
  const { dbUser } = await requireRole(["ADMIN"]);

  const get = (key: string) => ((formData.get(key) as string) || "").trim();
  const validTill = get("validTill");
  const name = get("name");
  const staffPhone = get("staffPhone");

  try {
    await createRecycler({
      name,
      contactPhone: get("contactPhone"),
      authorizationNo: get("authorizationNo"),
      authorizationValidTill: validTill ? new Date(validTill) : undefined,
      address: get("address"),
      area: get("area"),
      district: get("district"),
      state: get("state"),
      latitude: parseFloat(get("latitude")),
      longitude: parseFloat(get("longitude")),
      serviceRadiusKm: parseFloat(get("serviceRadiusKm")),
      staffPhone,
      staffPassword: formData.get("staffPassword") as string,
    });
  } catch (err) {
    if (err instanceof FlowError) {
      redirect(`/admin/recyclers?error=${encodeURIComponent(err.message)}`);
    }
    throw err;
  }

  await writeAudit({ actorId: dbUser.id, action: "RECYCLER_CREATED", entityType: "Recycler", details: { name } });
  revalidatePath("/admin/recyclers");
  redirect(`/admin/recyclers?success=${encodeURIComponent(`${name} added. Staff can sign in with ${staffPhone}.`)}`);
}

/**
 * M2: Set today's price per category. New lots are valued at these rates
 * (e.g. 10 kg plastic at ₹10/kg = ₹100). Blank inputs keep the previous price.
 */
export async function setTodayPricesAction(formData: FormData) {
  const { dbUser } = await requireRole(["ADMIN"]);

  const categories = await prisma.materialCategory.findMany({ where: { isActive: true }, select: { id: true } });
  const prices = categories
    .map((cat) => ({ categoryId: cat.id, rupees: parseFloat(formData.get(`price_${cat.id}`) as string) }))
    .filter((p) => Number.isFinite(p.rupees) && p.rupees > 0)
    .map((p) => ({ categoryId: p.categoryId, ratePerKgPaise: Math.round(p.rupees * 100) }));

  let updated: number;
  try {
    updated = await setTodayPrices(dbUser.id, prices);
  } catch (err) {
    if (err instanceof FlowError) {
      redirect(`/admin/prices?error=${encodeURIComponent(err.message)}`);
    }
    throw err;
  }

  await writeAudit({ actorId: dbUser.id, action: "TODAY_PRICES_SET", entityType: "PricePoint", details: { categories: updated } });
  revalidatePath("/admin/prices");
  revalidatePath("/collector/create-lot");
  redirect(`/admin/prices?success=${encodeURIComponent(`Today's price updated for ${updated} categories`)}`);
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

  const priceId = `PRICE-ADM-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  await prisma.pricePoint.create({
    data: {
      id: priceId,
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

  await writeAudit({ actorId: dbUser.id, action: "PRICE_ADDED", entityType: "PricePoint", entityId: priceId, details: { categoryId, area, district, buyerType } });
  revalidatePath("/admin/prices");
}

/**
 * M2: Delete / clean price record.
 */
export async function deletePriceRecordAction(priceId: string) {
  const { dbUser } = await requireRole(["ADMIN"]);
  const before = await prisma.pricePoint.findUnique({ where: { id: priceId } });
  await prisma.pricePoint.delete({ where: { id: priceId } });
  await writeAudit({ actorId: dbUser.id, action: "PRICE_DELETED", entityType: "PricePoint", entityId: priceId, details: before ? { categoryId: before.categoryId, buyingPricePaise: before.buyingPricePaise, source: before.source } : undefined });
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

  await writeAudit({ actorId: dbUser.id, action: "ANOMALY_REVIEWED", entityType: "AnomalyFlag", entityId: flagId, details: { status } });
  revalidatePath("/admin/anomalies");
  revalidatePath("/admin");
}

export async function reviewAnomalyFormAction(formData: FormData): Promise<void> {
  const flagId = formData.get("flagId") as string;
  const status = formData.get("status") as "REVIEWED" | "DISMISSED";
  if (flagId && status) {
    await reviewAnomalyAction(flagId, status);
  }
}

/**
 * Team Page: Create ADMIN or FIELD_AGENT user.
 */
export async function createTeamUserAction(formData: FormData) {
  const { dbUser } = await requireRole(["ADMIN"]);

  const phone = formData.get("phone") as string;
  const pin = formData.get("pin") as string;
  const role = formData.get("role") as "ADMIN" | "FIELD_AGENT";

  const pinHash = await hashPassword(pin);

  const created = await prisma.user.create({
    data: {
      phone,
      pinHash,
      role,
      language: "EN",
    },
  });
  await writeAudit({ actorId: dbUser.id, action: "TEAM_USER_CREATED", entityType: "User", entityId: created.id, details: { role } });

  revalidatePath("/admin/team");
}

/**
 * M6: Resolve a disputed lot (confirm the agreed amount or cancel). Note is required.
 */
export async function resolveDisputeFormAction(formData: FormData): Promise<void> {
  const { dbUser } = await requireRole(["ADMIN"]);
  const disputeId = (formData.get("disputeId") as string) || "";
  const outcome = formData.get("outcome") as DisputeOutcome;
  const note = (formData.get("note") as string) || "";
  if (!disputeId || (outcome !== "CONFIRM" && outcome !== "CANCEL")) return;

  try {
    await resolveDispute({ adminId: dbUser.id, disputeId, outcome, note });
  } catch (err) {
    if (err instanceof FlowError) {
      redirect(`/admin/disputes?error=${encodeURIComponent(err.message)}`);
    }
    throw err;
  }

  revalidatePath("/admin/disputes");
  revalidatePath("/admin");
  redirect(`/admin/disputes?success=${encodeURIComponent("Dispute resolved")}`);
}
