"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { createSessionCookie, clearSessionCookie, requireRole } from "@/lib/auth/session";
import { FlowError, MAX_LOT_PHOTOS, createLot, confirmLot, rebroadcastLot, selectOffer } from "@/lib/services/lotFlowService";
import { parseAskingPricePaise, type LotItemInput } from "@/lib/domain/lotItems";
import { saveLotImage } from "@/lib/storage";
import { amountPaise } from "@/lib/domain/money";

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
  const fail = (message: string): never => redirect(`/collector/create-lot?error=${encodeURIComponent(message)}`);

  // One "weight_<categoryId>" field (kg) per selected material
  const items: LotItemInput[] = [];
  for (const [key, value] of formData.entries()) {
    const match = /^weight_(\d+)$/.exec(key);
    if (!match || typeof value !== "string" || value.trim() === "") continue;
    const kg = parseFloat(value);
    if (!Number.isFinite(kg) || kg <= 0) {
      fail("Please enter a valid weight in kg for every material");
    }
    items.push({ categoryId: Number(match[1]), weightGrams: Math.round(kg * 1000) });
  }
  if (items.length === 0) {
    fail("Choose at least one material and enter its weight");
  }

  // Optional own selling price (₹ for the whole lot); blank = today's rate
  const asking = parseAskingPricePaise((formData.get("askingPrice") as string | null)?.trim());
  if ("error" in asking) return fail(asking.error);

  const photos = formData.getAll("photos").filter((p): p is File => p instanceof File && p.size > 0);
  if (photos.length > MAX_LOT_PHOTOS) {
    fail(`You can add at most ${MAX_LOT_PHOTOS} photos`);
  }

  const collector = await prisma.collector.findFirst({
    where: { userId: user.userId },
  });

  if (!collector) {
    return fail("Collector profile not found");
  }

  let lotId: string;
  try {
    const photoKeys: string[] = [];
    for (const photo of photos) {
      photoKeys.push(await saveLotImage(user.userId, Buffer.from(await photo.arrayBuffer()), photo.type));
    }

    const lot = await createLot({
      collectorId: collector.id,
      items,
      latitude: parseFloat(formData.get("latitude") as string),
      longitude: parseFloat(formData.get("longitude") as string),
      photoKeys,
      askingPricePaise: asking.paise,
    });
    lotId = lot.id;
  } catch (err) {
    if (err instanceof FlowError) fail(err.message);
    if (err instanceof Error && /photo/i.test(err.message)) fail(err.message);
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
  const agreedPricePaise = amountPaise(lot.approxWeightGrams, agreedRatePaise);

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
    await db.lotItem.deleteMany({ where: { lotId } });
    await db.vehicleDispatch.deleteMany({ where: { lotId } });
    await db.receiptShareToken.deleteMany({ where: { lotId } });
    await db.payment.deleteMany({ where: { lotId } });
    await db.handover.deleteMany({ where: { lotId } });
    await db.transaction.deleteMany({ where: { lotId } });
    await db.lot.delete({ where: { id: lotId } });
  });

  redirect("/collector?success=Lot+deleted+successfully");
}

/**
 * Collector updates their own name, area and district.
 */
export async function updateCollectorProfileAction(formData: FormData) {
  const { user } = await requireRole(["COLLECTOR"]);

  const name = ((formData.get("name") as string) || "").trim();
  const operatingArea = ((formData.get("operatingArea") as string) || "").trim();
  const district = ((formData.get("district") as string) || "").trim();

  if (name.length < 2 || name.length > 60) {
    redirect("/collector/profile?error=Please enter your name");
  }
  if (operatingArea.length < 2 || operatingArea.length > 80) {
    redirect("/collector/profile?error=Please enter your area");
  }

  await prisma.collector.update({
    where: { userId: user.userId },
    data: { name, operatingArea, district: district || null },
  });

  redirect("/collector/profile?success=Profile saved");
}

export async function createPickupRequestAction(formData: FormData) {
  const { user } = await requireRole(["COLLECTOR", "ADMIN"]);
  const lotId = formData.get("lotId") as string;
  const recyclerId = formData.get("recyclerId") as string;
  const slotTime = (formData.get("slotTime") as string) || "morning"; // morning, afternoon, evening
  const landmark = (formData.get("landmark") as string)?.trim() || null;
  const latStr = formData.get("latitude") as string;
  const lngStr = formData.get("longitude") as string;

  const lot = await prisma.lot.findUnique({
    where: { id: lotId },
    include: { collector: true },
  });
  if (!lot) redirect("/collector?error=Lot not found");

  const now = new Date();
  const targetDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // tomorrow
  if (slotTime === "morning") targetDate.setHours(10, 0, 0, 0);
  else if (slotTime === "afternoon") targetDate.setHours(14, 0, 0, 0);
  else targetDate.setHours(17, 0, 0, 0);

  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  await prisma.pickupRequest.create({
    data: {
      collectorId: user.userId,
      recyclerId,
      lotId,
      slot: targetDate,
      pickupLat: latStr ? parseFloat(latStr) : lot.collectLat,
      pickupLng: lngStr ? parseFloat(lngStr) : lot.collectLng,
      landmark,
      status: "REQUESTED",
      expiresAt,
    },
  });

  redirect("/collector/pickup-requests?success=Pickup+request+sent+successfully");
}

export async function simulateNextPickupStatusAction(formData: FormData) {
  await requireRole(["COLLECTOR", "ADMIN"]);
  const requestId = formData.get("requestId") as string;

  const req = await prisma.pickupRequest.findUnique({ where: { id: requestId } });
  if (!req) return;

  const order = ["REQUESTED", "ACCEPTED", "ON_THE_WAY", "ARRIVED", "COMPLETED"];
  const currIdx = order.indexOf(req.status);
  if (currIdx < 0 || currIdx >= order.length - 1) return;

  const nextStatus = order[currIdx + 1];
  const etaMinutes = nextStatus === "ON_THE_WAY" ? 25 : nextStatus === "ARRIVED" ? 0 : null;

  await prisma.pickupRequest.update({
    where: { id: requestId },
    data: {
      status: nextStatus,
      etaMinutes,
      updatedAt: new Date(),
    },
  });

  if (nextStatus === "COMPLETED") {
    await prisma.lot.update({
      where: { id: req.lotId },
      data: { status: "MATCHED", chosenRecyclerId: req.recyclerId },
    });
  }

  revalidatePath("/collector/pickup-requests");
}

export async function cancelPickupRequestAction(formData: FormData) {
  await requireRole(["COLLECTOR", "ADMIN"]);
  const requestId = formData.get("requestId") as string;
  const reason = (formData.get("reason") as string)?.trim() || "Collector cancelled request";

  await prisma.pickupRequest.update({
    where: { id: requestId },
    data: {
      status: "CANCELLED",
      cancellationReason: reason,
      updatedAt: new Date(),
    },
  });

  revalidatePath("/collector/pickup-requests");
}

export async function submitCoverageRequestAction(formData: FormData) {
  const { user } = await requireRole(["COLLECTOR", "ADMIN"]);
  const lotId = formData.get("lotId") as string;

  const lot = await prisma.lot.findUnique({
    where: { id: lotId },
    include: { collector: true },
  });

  if (!lot) redirect("/collector?error=Lot not found");

  await prisma.coverageRequest.create({
    data: {
      collectorId: user.userId,
      categoryId: lot.categoryId,
      approxWeightGrams: lot.approxWeightGrams,
      latitude: lot.collectLat ?? 19.0434,
      longitude: lot.collectLng ?? 72.8567,
    },
  });

  redirect(`/collector/lots/${lotId}?success=${encodeURIComponent("Area demand logged! You will be alerted when an authorized recycler covers this area.")}`);
}
