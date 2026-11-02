"use server";

import { prisma } from "@/lib/prisma";
import { requireRole, createSessionCookie, clearSessionCookie } from "@/lib/auth/session";
import { writeAudit } from "@/lib/services/auditService";
import { resolveDispute, type DisputeOutcome } from "@/lib/services/disputeService";
import { verifyPassword, hashPassword } from "@/lib/auth/password";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createRecycler, setRecyclerStatus, setTodayPrices, updateRecycler } from "@/lib/services/adminService";
import { RECYCLER_FORM_FIELDS, type RecyclerFormState, type RecyclerFormValues } from "./recyclers/recyclerFormState";
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
 * M1: Add a recycler facility with its staff login, or edit one (when `recyclerId` is posted).
 * Used with useActionState: on an error the typed values come back so the form keeps them.
 */
export async function saveRecyclerAction(prev: RecyclerFormState, formData: FormData): Promise<RecyclerFormState> {
  const { dbUser } = await requireRole(["ADMIN"]);

  const get = (key: string) => ((formData.get(key) as string) || "").trim();
  const values = Object.fromEntries(RECYCLER_FORM_FIELDS.map((key) => [key, get(key)])) as RecyclerFormValues;
  const recyclerId = get("recyclerId");
  const input = {
    name: values.name,
    contactPhone: values.contactPhone,
    authorizationNo: values.authorizationNo,
    authorizationValidTill: values.validTill ? new Date(values.validTill) : undefined,
    address: values.address,
    area: values.area,
    district: values.district,
    latitude: parseFloat(values.latitude),
    longitude: parseFloat(values.longitude),
    serviceRadiusKm: parseFloat(values.serviceRadiusKm),
    staffPhone: values.staffPhone,
    staffPassword: (formData.get("staffPassword") as string) || undefined,
  };

  try {
    if (recyclerId) {
      await updateRecycler(recyclerId, input);
    } else {
      await createRecycler({ ...input, staffPassword: input.staffPassword ?? "" });
    }
  } catch (err) {
    if (err instanceof FlowError) {
      return { error: err.message, values, attempt: prev.attempt + 1 };
    }
    throw err;
  }

  await writeAudit({
    actorId: dbUser.id,
    action: recyclerId ? "RECYCLER_UPDATED" : "RECYCLER_CREATED",
    entityType: "Recycler",
    entityId: recyclerId || undefined,
    details: { name: values.name },
  });
  revalidatePath("/admin/recyclers");
  revalidatePath("/admin");
  const message = recyclerId
    ? `${values.name} updated.`
    : `${values.name} added. Staff can sign in with ${values.staffPhone}.`;
  redirect(`/admin/recyclers?success=${encodeURIComponent(message)}`);
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

// M2 prices are append-only (spec s2 rule 6): there is no delete. A wrong price is corrected by adding a new one.

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
