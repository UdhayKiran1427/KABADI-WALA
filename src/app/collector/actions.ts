"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { createSessionCookie, clearSessionCookie, requireRole } from "@/lib/auth/session";
import { generateLotRef } from "@/lib/domain/lotRef";
import { calculateEstimate } from "@/lib/domain/estimates";
import { generateVerificationCode } from "@/lib/domain/handover";
import { randomUUID } from "crypto";

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

  const approxWeightGrams = Math.round(weightKg * 1000);

  // Find collector profile
  const collector = await prisma.collector.findFirst({
    where: { userId: user.userId },
  });

  if (!collector) {
    redirect("/collector/create-lot?error=Collector profile not found");
  }

  // Count existing lots to generate sequence
  const lotCount = await prisma.lot.count({
    where: { collectorId: collector.id },
  });

  const lotRef = generateLotRef(collector.shortCode, new Date(), lotCount + 1);
  const lotId = randomUUID();

  // Fetch recent price points for estimate calculation
  const recentPrices = await prisma.pricePoint.findMany({
    where: { categoryId },
    orderBy: { recordedAt: "desc" },
    take: 30,
    select: { buyingPricePaise: true, recordedAt: true },
  });

  const fallbackRates = await prisma.recyclerRate.findMany({
    where: { categoryId, isCurrent: true },
    select: { ratePerKgPaise: true },
  });

  const estimate = calculateEstimate(
    recentPrices.map((p) => ({ buyingPricePaise: p.buyingPricePaise, recordedAt: p.recordedAt })),
    fallbackRates.map((r) => ({ ratePerKgPaise: r.ratePerKgPaise, isCurrent: true })),
    approxWeightGrams
  );

  await prisma.lot.create({
    data: {
      id: lotId,
      lotRef,
      collectorId: collector.id,
      categoryId,
      approxWeightGrams,
      estimatedValuePaise: estimate.estimatedValuePaise,
      status: "READY",
      collectedAt: new Date(),
    },
  });

  redirect(`/collector/lots/${lotId}/match`);
}

export async function selectRecyclerForLotAction(formData: FormData) {
  const { user } = await requireRole(["COLLECTOR", "ADMIN"]);

  const lotId = formData.get("lotId") as string;
  const recyclerId = formData.get("recyclerId") as string;

  if (!lotId || !recyclerId) {
    redirect(`/collector?error=Missing lot or recycler information`);
  }

  const lot = await prisma.lot.findUnique({
    where: { id: lotId },
    include: { collector: true },
  });

  if (!lot || (user.role !== "ADMIN" && lot.collector.userId !== user.userId)) {
    redirect(`/collector?error=Lot not found or access denied`);
  }

  // Find active rate for this category
  const activeRate = await prisma.recyclerRate.findFirst({
    where: { recyclerId, categoryId: lot.categoryId, isCurrent: true },
  });

  if (!activeRate) {
    redirect(`/collector/lots/${lotId}/match?error=This recycler does not currently accept this material`);
  }

  const quotedRatePaise = activeRate.ratePerKgPaise;
  const agreedPricePaise = Math.round((quotedRatePaise * lot.approxWeightGrams) / 1000);

  const txId = randomUUID();
  const handoverId = randomUUID();
  const verificationCode = generateVerificationCode();
  const handoverRef = `HND-${lot.collector.shortCode}-${Date.now().toString().slice(-6)}`;
  const now = new Date();

  await prisma.$transaction(async (prismaTx) => {
    await prismaTx.lot.update({
      where: { id: lotId },
      data: {
        status: "MATCHED",
        chosenRecyclerId: recyclerId,
        quotedRatePaise,
      },
    });

    await prismaTx.transaction.create({
      data: {
        id: txId,
        lotId,
        collectorId: lot.collectorId,
        recyclerId,
        status: "ACCEPTED",
        quotedRatePerKgPaise: quotedRatePaise,
        quotedPricePaise: agreedPricePaise,
        handoverLat: 19.0434,
        handoverLng: 72.8567,
      },
    });

    await prismaTx.handover.create({
      data: {
        id: handoverId,
        lotId,
        transactionId: txId,
        handoverRef,
        verificationCode,
        qrPayload: JSON.stringify({ lotId, lotRef: lot.lotRef, verificationCode }),
        status: "PENDING",
        declaredWeightGrams: lot.approxWeightGrams,
        locationClass: "MATCH",
        capturedAt: now,
      },
    });
  });

  redirect(`/collector/lots/${lotId}`);
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

  redirect(`/collector/lots/${lotId}?success=Price offer of ₹${offerRateRupees}/kg sent to recycler!`);
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

  redirect(`/collector/lots/${lotId}?success=Agreed price of ₹${(agreedRatePaise / 100).toFixed(0)}/kg confirmed!`);
}


export async function collectorRegisterAction(formData: FormData) {
  const phone = (formData.get("phone") as string)?.trim();
  const pin = (formData.get("pin") as string)?.trim();
  const confirmPin = (formData.get("confirmPin") as string)?.trim();
  const preferredLanguage = ((formData.get("preferredLanguage") as string)?.toUpperCase() || "HI") as "HI" | "MR" | "EN";
  const operatingArea = (formData.get("operatingArea") as string)?.trim() || "Dharavi";
  const district = (formData.get("district") as string)?.trim() || "Mumbai";
  const hasConsent = formData.get("hasConsent") === "on" || formData.get("hasConsent") === "true";

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
