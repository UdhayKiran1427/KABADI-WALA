"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { createSessionCookie, clearSessionCookie, requireRole } from "@/lib/auth/session";
import { FlowError, createLot, confirmLot, rebroadcastLot, selectOffer } from "@/lib/services/lotFlowService";

export async function collectorLoginAction(formData: FormData) {
  const phone = (formData.get("phone") as string)?.trim();
  const pin = (formData.get("pin") as string)?.trim();

  if (!phone || !pin) {
    redirect("/collector/login?error=Phone and 4-digit PIN are required");
  }

  const user = await prisma.user.findUnique({
    where: { phone },
    include: { collector: true },
  });

  if (!user || user.role !== "COLLECTOR" || !user.pinHash) {
    redirect("/collector/login?error=Invalid phone number or PIN");
  }

  const isValidPin = await verifyPassword(pin, user.pinHash);
  if (!isValidPin) {
    redirect("/collector/login?error=Invalid phone number or PIN");
  }

  await createSessionCookie({
    userId: user.id,
    phone: user.phone,
    role: user.role,
  });

  redirect("/collector");
}

export async function collectorLogoutAction() {
  await clearSessionCookie();
  redirect("/collector/login");
}

export async function createCollectorLotAction(formData: FormData) {
  const { user } = await requireRole(["COLLECTOR", "ADMIN"]);

  const categoryId = parseInt(formData.get("categoryId") as string, 10);
  const weightKg = parseFloat(formData.get("weightKg") as string);

  if (isNaN(categoryId) || isNaN(weightKg) || weightKg <= 0) {
    redirect("/collector/create-lot?error=Please select a category and enter a valid weight in kg");
  }

  const collector = await prisma.collector.findFirst({
    where: { userId: user.userId },
  });

  if (!collector) {
    redirect("/collector/create-lot?error=Collector profile not found");
  }

  let lotId: string;
  try {
    const lot = await createLot({
      collectorId: collector.id,
      categoryId,
      approxWeightGrams: Math.round(weightKg * 1000),
      latitude: parseFloat(formData.get("latitude") as string),
      longitude: parseFloat(formData.get("longitude") as string),
    });
    lotId = lot.id;
  } catch (err) {
    if (err instanceof FlowError) {
      redirect(`/collector/create-lot?categoryId=${categoryId}&error=${encodeURIComponent(err.message)}`);
    }
    throw err;
  }

  redirect(`/collector/lots/${lotId}`);
}

async function findOwnedLot(lotId: string, user: { userId: string; role: string }) {
  if (!lotId) {
    redirect("/collector?error=Lot ID is required");
  }
  const lot = await prisma.lot.findUnique({
    where: { id: lotId },
    include: { collector: true },
  });
  if (!lot || (user.role !== "ADMIN" && lot.collector.userId !== user.userId)) {
    redirect("/collector?error=Lot not found or access denied");
  }
  return lot;
}

/**
 * Runs a lot flow step and returns to the lot page with its outcome message.
 */
async function runLotStep(lotId: string, step: () => Promise<string>): Promise<never> {
  let message: string;
  try {
    message = await step();
  } catch (err) {
    if (err instanceof FlowError) {
      redirect(`/collector/lots/${lotId}?error=${encodeURIComponent(err.message)}`);
    }
    throw err;
  }
  redirect(`/collector/lots/${lotId}?success=${encodeURIComponent(message)}`);
}

/**
 * Collector confirms the lot summary; it is then broadcast to recyclers within 5 km.
 */
export async function confirmLotAction(formData: FormData) {
  const { user } = await requireRole(["COLLECTOR", "ADMIN"]);
  const lot = await findOwnedLot(formData.get("lotId") as string, user);

  await runLotStep(lot.id, async () => {
    const { totalNotified } = await confirmLot(lot.id);
    return totalNotified > 0
      ? `Lot sent to ${totalNotified} recycler(s) within 5 km. Wait for them to respond.`
      : "No verified recycler found within 5 km yet. Try searching again later.";
  });
}

/**
 * Re-runs the 5 km broadcast for a READY lot (reaches recyclers added since the first broadcast).
 */
export async function rebroadcastLotAction(formData: FormData) {
  const { user } = await requireRole(["COLLECTOR", "ADMIN"]);
  const lot = await findOwnedLot(formData.get("lotId") as string, user);

  await runLotStep(lot.id, async () => {
    const { newlyNotified } = await rebroadcastLot(lot.id);
    return newlyNotified > 0 ? `Sent to ${newlyNotified} more recycler(s) within 5 km.` : "No new recyclers found within 5 km.";
  });
}

/**
 * Collector picks one of the recyclers who said "ready to buy".
 */
export async function selectRecyclerOfferAction(formData: FormData) {
  const { user } = await requireRole(["COLLECTOR", "ADMIN"]);
  const lot = await findOwnedLot(formData.get("lotId") as string, user);

  await runLotStep(lot.id, async () => {
    await selectOffer(lot.id, formData.get("offerId") as string);
    return "Recycler selected. You can now see each other's details and complete payment.";
  });
}

export async function collectorBargainOfferAction(formData: FormData) {
  const { user } = await requireRole(["COLLECTOR", "ADMIN"]);
  const lotId = formData.get("lotId") as string;
  const offerRateRupees = parseFloat(formData.get("offerRateRupees") as string);
  const note = (formData.get("note") as string)?.trim() || "";

  if (!lotId || isNaN(offerRateRupees) || offerRateRupees <= 0) {
    redirect(`/collector/lots/${lotId}?error=Please enter a valid offer rate in rupees/kg`);
  }

  const lot = await prisma.lot.findUnique({
    where: { id: lotId },
    include: { collector: true, transaction: true },
  });

  if (!lot || (user.role !== "ADMIN" && lot.collector.userId !== user.userId) || !lot.transaction) {
    redirect(`/collector?error=Lot or transaction not found`);
  }

  const offerRatePaise = Math.round(offerRateRupees * 100);

  await prisma.transaction.update({
    where: { id: lot.transaction.id },
    data: {
      bargainRatePaise: offerRatePaise,
      bargainBy: "COLLECTOR",
      bargainNote: note,
      bargainStatus: "OFFER_BY_COLLECTOR",
    },
  });

  // Notify recycler staff
  const staff = await prisma.recyclerStaff.findFirst({
    where: { recyclerId: lot.transaction.recyclerId },
  });

  if (staff) {
    const { sendNotification } = await import("@/lib/services/notificationService");
    await sendNotification({
      userId: staff.userId,
      title: "💬 New Price Offer from Collector",
      body: `Collector #${lot.collector.shortCode} offered ₹${offerRateRupees}/kg for Lot ${lot.lotRef}.`,
      dataJson: { lotId, offerRatePaise, note },
    });
  }

  redirect(`/collector/lots/${lotId}?success=Price+offer+of+Rs+${offerRateRupees}+sent+to+recycler`);
}

export async function collectorAcceptBargainAction(formData: FormData) {
  const { user } = await requireRole(["COLLECTOR", "ADMIN"]);
  const lotId = formData.get("lotId") as string;

  const lot = await prisma.lot.findUnique({
    where: { id: lotId },
    include: { collector: true, transaction: true },
  });

  if (!lot || (user.role !== "ADMIN" && lot.collector.userId !== user.userId) || !lot.transaction || !lot.transaction.bargainRatePaise) {
    redirect(`/collector?error=No active price offer to accept`);
  }

  const agreedRatePaise = lot.transaction.bargainRatePaise;
  const agreedPricePaise = Math.round((agreedRatePaise * lot.approxWeightGrams) / 1000);

  await prisma.$transaction(async (tx) => {
    await tx.transaction.update({
      where: { id: lot.transaction!.id },
      data: {
        quotedRatePerKgPaise: agreedRatePaise,
        quotedPricePaise: agreedPricePaise,
        bargainStatus: "AGREED",
        agreedRatePaise,
      },
    });

    await tx.lot.update({
      where: { id: lot.id },
      data: {
        quotedRatePaise: agreedRatePaise,
      },
    });
  });

  // Notify recycler staff
  const staff = await prisma.recyclerStaff.findFirst({
    where: { recyclerId: lot.transaction.recyclerId },
  });

  if (staff) {
    const { sendNotification } = await import("@/lib/services/notificationService");
    await sendNotification({
      userId: staff.userId,
      title: "✓ Price Confirmed by Collector",
      body: `Collector #${lot.collector.shortCode} accepted ₹${(agreedRatePaise / 100).toFixed(0)}/kg for Lot ${lot.lotRef}!`,
      dataJson: { lotId, agreedRatePaise },
    });
  }

  redirect(`/collector/lots/${lotId}?success=Agreed+price+of+Rs+${(agreedRatePaise / 100).toFixed(0)}+confirmed`);
}


export async function collectorRegisterAction(formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  const phone = (formData.get("phone") as string)?.trim();
  const pin = (formData.get("pin") as string)?.trim();
  const confirmPin = (formData.get("confirmPin") as string)?.trim();
  const preferredLanguage = ((formData.get("preferredLanguage") as string)?.toUpperCase() || "HI") as "HI" | "MR" | "EN";
  const operatingArea = (formData.get("operatingArea") as string)?.trim() || "Dharavi";
  const district = (formData.get("district") as string)?.trim() || "Mumbai";
  const hasConsent = formData.get("hasConsent") === "on" || formData.get("hasConsent") === "true";

  if (!name || name.length < 2) {
    redirect("/collector/register?error=Please enter your name");
  }

  if (!phone || !/^\d{10}$/.test(phone)) {
    redirect("/collector/register?error=Please enter a valid 10-digit mobile number");
  }

  if (!pin || !/^\d{4}$/.test(pin)) {
    redirect("/collector/register?error=PIN must be exactly 4 digits");
  }

  if (pin !== confirmPin) {
    redirect("/collector/register?error=PIN and Confirm PIN do not match");
  }

  if (!hasConsent) {
    redirect("/collector/register?error=You must accept the terms and consent to register");
  }

  const existing = await prisma.user.findUnique({
    where: { phone },
  });

  if (existing) {
    redirect("/collector/register?error=This phone number is already registered. Please log in.");
  }

  const { hashPin } = await import("@/lib/auth/password");
  const { generateUniqueShortCode } = await import("@/lib/services/collectorService");
  const { createSessionCookie } = await import("@/lib/auth/session");

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
        name,
        shortCode,
        preferredLanguage,
        operatingArea,
        district,
        consentAt: new Date(),
      },
    });

    await tx.consentRecord.create({
      data: {
        userId: user.id,
        version: "1.0-WEB",
        language: preferredLanguage,
        locationConsent: true,
      },
    });

    return { user, collector };
  });

  await createSessionCookie({
    userId: created.user.id,
    phone: created.user.phone,
    role: "COLLECTOR",
  });

  redirect("/collector?welcome=true");
}


export async function deleteLotAction(formData: FormData) {
  const { user } = await requireRole(["COLLECTOR", "ADMIN"]);
  const lotId = formData.get("lotId") as string;

  if (!lotId) {
    redirect("/collector?error=Lot ID is required");
  }

  const lot = await prisma.lot.findUnique({
    where: { id: lotId },
    include: { collector: true },
  });

  if (!lot) {
    redirect("/collector?error=Lot not found");
  }

  if (user.role !== "ADMIN" && lot.collector.userId !== user.userId) {
    redirect("/collector?error=You do not have permission to delete this lot");
  }

  if (lot.status === "COMPLETED" || lot.status === "HANDED_OVER") {
    redirect(`/collector/lots/${lotId}?error=Cannot delete a lot that has already been handed over or paid`);
  }

  await prisma.$transaction(async (db) => {
    await db.lotImage.deleteMany({ where: { lotId } });
    await db.pickupRequest.deleteMany({ where: { lotId } });
    await db.dispute.deleteMany({ where: { lotId } });
    await db.matchSuggestion.deleteMany({ where: { lotId } });
    await db.lotOffer.deleteMany({ where: { lotId } });
    await db.receiptShareToken.deleteMany({ where: { lotId } });
    await db.payment.deleteMany({ where: { lotId } });
    await db.handover.deleteMany({ where: { lotId } });
    await db.transaction.deleteMany({ where: { lotId } });
    await db.lot.delete({ where: { id: lotId } });
  });

  redirect("/collector?success=Lot+deleted+successfully");
}
