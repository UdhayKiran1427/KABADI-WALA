"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifyPassword, hashPassword } from "@/lib/auth/password";
import { createSessionCookie, clearSessionCookie, requireRole } from "@/lib/auth/session";
import { Language, Condition, DataSplit } from "@prisma/client";
import { randomUUID } from "crypto";

export async function fieldLoginAction(formData: FormData) {
  const phone = (formData.get("phone") as string)?.trim();
  const password = (formData.get("password") as string)?.trim();

  if (!phone || !password) {
    redirect("/field/login?error=Phone and password are required");
  }

  const user = await prisma.user.findUnique({
    where: { phone },
  });

  if (!user || (user.role !== "FIELD_AGENT" && user.role !== "ADMIN") || !user.pinHash) {
    redirect("/field/login?error=Invalid credentials or unauthorized");
  }

  const isValid = await verifyPassword(password, user.pinHash);
  if (!isValid) {
    redirect("/field/login?error=Invalid phone number or password");
  }

  await createSessionCookie({
    userId: user.id,
    phone: user.phone,
    role: user.role,
  });

  redirect("/field");
}

export async function fieldLogoutAction() {
  await clearSessionCookie();
  redirect("/field/login");
}

export async function onboardCollectorAction(formData: FormData) {
  const { user } = await requireRole(["FIELD_AGENT", "ADMIN"]);

  const phone = (formData.get("phone") as string)?.trim();
  const pin = ((formData.get("pin") as string)?.trim()) || "1234";
  const preferredLanguage = (formData.get("preferredLanguage") as Language) || Language.HI;
  const operatingArea = (formData.get("operatingArea") as string)?.trim() || "Dharavi Labour Camp";
  const district = (formData.get("district") as string)?.trim() || "Mumbai";
  const locationConsent = formData.get("locationConsent") === "on";

  if (!phone || phone.length !== 10) {
    redirect("/field/onboard?error=Please enter a valid 10-digit mobile number");
  }

  const existingUser = await prisma.user.findUnique({
    where: { phone },
  });

  if (existingUser) {
    redirect("/field/onboard?error=A user with this mobile phone is already registered");
  }

  const pinHash = await hashPassword(pin);
  const shortCode = `COL-${Math.floor(1000 + Math.random() * 9000)}`;
  const restoreCode = `RESTORE-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        phone,
        pinHash,
        role: "COLLECTOR",
        language: preferredLanguage,
      },
    });

    await tx.collector.create({
      data: {
        userId: newUser.id,
        shortCode,
        preferredLanguage,
        operatingArea,
        district,
        consentAt: now,
        onboardedById: user.userId,
      },
    });

    await tx.consentRecord.create({
      data: {
        userId: newUser.id,
        version: "v1.0-field-onboarded",
        language: preferredLanguage,
        locationConsent,
        timestamp: now,
      },
    });

    await tx.deviceRestore.create({
      data: {
        userId: newUser.id,
        deviceId: "field-agent-device",
        restoreCode,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      },
    });
  });

  redirect(
    `/field?success=Collector successfully onboarded! Phone: ${phone}, PIN: ${pin}, ShortCode: ${shortCode}`
  );
}

export async function logMarketPriceAction(formData: FormData) {
  const { user } = await requireRole(["FIELD_AGENT", "ADMIN"]);

  const categoryId = parseInt(formData.get("categoryId") as string, 10);
  const buyingPriceRupees = parseFloat(formData.get("buyingPriceRupees") as string);
  const area = (formData.get("area") as string)?.trim() || "Dharavi Scrap Yard";
  const district = (formData.get("district") as string)?.trim() || "Mumbai";
  const latitude = parseFloat(formData.get("latitude") as string) || 19.0434;
  const longitude = parseFloat(formData.get("longitude") as string) || 72.8567;
  const buyerType = (formData.get("buyerType") as string) || "SCRAP_DEALER";

  if (isNaN(categoryId) || isNaN(buyingPriceRupees) || buyingPriceRupees <= 0) {
    redirect("/field/prices?error=Please select a category and enter a valid price in rupees");
  }

  const buyingPricePaise = Math.round(buyingPriceRupees * 100);
  const priceId = randomUUID();
  const now = new Date();

  await prisma.pricePoint.create({
    data: {
      id: priceId,
      categoryId,
      area,
      district,
      latitude,
      longitude,
      recordedAt: now,
      buyingPricePaise,
      marketLowPaise: Math.round(buyingPricePaise * 0.9),
      marketHighPaise: Math.round(buyingPricePaise * 1.1),
      source: "FIELD_AGENT",
      buyerType,
      recordedById: user.userId,
    },
  });

  redirect(`/field/prices?success=Spot+market+price+of+Rs+${buyingPriceRupees}+logged+for+category+#${categoryId}`);
}

export async function uploadTrainingPhotoAction(formData: FormData) {
  const { user } = await requireRole(["FIELD_AGENT", "ADMIN"]);

  const categoryId = parseInt(formData.get("categoryId") as string, 10);
  const subCategory = (formData.get("subCategory") as string)?.trim() || "Unsorted";
  const condition = (formData.get("condition") as Condition) || Condition.UNKNOWN;
  const split = (formData.get("split") as DataSplit) || DataSplit.TRAIN;
  const storageKey = `images/field-agent/${Date.now()}_${Math.random().toString(36).substring(2, 7)}.jpg`;

  if (isNaN(categoryId)) {
    redirect("/field/training?error=Please select a material category");
  }

  // Find or create field agent lot for training samples
  let trainingLot = await prisma.lot.findFirst({
    where: { subCategory: "FIELD_AGENT_TRAINING_CONTAINER" },
  });

  if (!trainingLot) {
    const collector = await prisma.collector.findFirst();
    if (!collector) {
      redirect("/field/training?error=Collector profile required for container");
    }
    trainingLot = await prisma.lot.create({
      data: {
        id: randomUUID(),
        lotRef: `TRN-AGENT-${Date.now().toString().slice(-6)}`,
        collectorId: collector.id,
        categoryId,
        approxWeightGrams: 1000,
        subCategory: "FIELD_AGENT_TRAINING_CONTAINER",
        status: "DRAFT",
        collectedAt: new Date(),
      },
    });
  }

  const imageId = randomUUID();
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.lotImage.create({
      data: {
        id: imageId,
        lotId: trainingLot.id,
        kind: "TRAINING",
        storageKey,
        takenAt: now,
      },
    });

    await tx.trainingSample.create({
      data: {
        imageId,
        categoryId,
        split,
        quality: "GOOD",
        labelSource: "FIELD_AGENT",
        capturedById: user.userId,
      },
    });
  });

  redirect(`/field/training?success=Training sample logged and labeled for category #${categoryId}`);
}


export async function fieldRegisterAction(formData: FormData): Promise<void> {
  const phone = (formData.get("phone") as string)?.trim();
  const password = (formData.get("password") as string)?.trim();
  const confirmPassword = (formData.get("confirmPassword") as string)?.trim();
  const language = ((formData.get("language") as string)?.toUpperCase() || "EN") as Language;
  const assignedArea = (formData.get("assignedArea") as string)?.trim() || "Mumbai Central Hub";

  if (!phone || !password) {
    redirect("/field/register?error=Phone and password are required");
  }

  if (!/^\d{10}$/.test(phone)) {
    redirect("/field/register?error=Mobile phone must be 10 digits");
  }

  if (password.length < 6) {
    redirect("/field/register?error=Password must be at least 6 characters");
  }

  if (password !== confirmPassword) {
    redirect("/field/register?error=Passwords do not match");
  }

  const existing = await prisma.user.findUnique({
    where: { phone },
  });

  if (existing) {
    redirect("/field/register?error=A user with this phone number already exists. Please sign in.");
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      phone,
      pinHash: passwordHash,
      role: "FIELD_AGENT",
      language,
    },
  });

  await createSessionCookie({
    userId: user.id,
    phone: user.phone,
    role: "FIELD_AGENT",
  });

  redirect("/field?welcome=true");
}


export async function agentUpdatePickupStatusAction(formData: FormData) {
  const { user } = await requireRole(["FIELD_AGENT", "ADMIN"]);
  const requestId = formData.get("requestId") as string;
  const newStatus = formData.get("status") as string;

  if (!requestId || !newStatus) {
    redirect("/field/pickups?error=Invalid pickup request parameters");
  }

  const pickup = await prisma.pickupRequest.findUnique({
    where: { id: requestId },
    include: {
      lot: { include: { category: true } },
      collector: true,
      recycler: true,
    },
  });

  if (!pickup) {
    redirect("/field/pickups?error=Pickup request not found");
  }

  await prisma.pickupRequest.update({
    where: { id: requestId },
    data: { status: newStatus },
  });

  const { sendNotification } = await import("@/lib/services/notificationService");

  if (newStatus === "ON_THE_WAY") {
    await sendNotification({
      userId: pickup.collectorId,
      title: "🚚 Pickup Agent is On The Way!",
      body: `Field agent is traveling to your location with a portable scale for Lot ${pickup.lot.lotRef}.`,
      dataJson: { lotId: pickup.lotId, requestId: pickup.id, status: newStatus },
    });
  } else if (newStatus === "ARRIVED") {
    await sendNotification({
      userId: pickup.collectorId,
      title: "📍 Pickup Agent Has Reached!",
      body: `Field agent has arrived at your location. Please bring your ${pickup.lot.category.nameEn} for scale weighing.`,
      dataJson: { lotId: pickup.lotId, requestId: pickup.id, status: newStatus },
    });
  }

  redirect(`/field/pickups?success=Status updated to ${newStatus}`);
}

export async function agentCompleteDoorstepHandoverAction(formData: FormData) {
  const { user } = await requireRole(["FIELD_AGENT", "ADMIN"]);
  const requestId = formData.get("requestId") as string;
  const scaleWeightKg = parseFloat(formData.get("scaleWeightKg") as string);
  const verificationCode = (formData.get("verificationCode") as string)?.trim();
  const paymentMode = (formData.get("paymentMode") as string) || "CASH";

  if (!requestId || isNaN(scaleWeightKg) || scaleWeightKg <= 0) {
    redirect("/field/pickups?error=Please enter a valid scale weight in kg");
  }

  const pickup = await prisma.pickupRequest.findUnique({
    where: { id: requestId },
    include: {
      lot: {
        include: {
          category: true,
          collector: { include: { user: true } },
          transaction: true,
        },
      },
      recycler: true,
    },
  });

  if (!pickup || !pickup.lot) {
    redirect("/field/pickups?error=Pickup request or lot not found");
  }

  const lot = pickup.lot;
  const tx = lot.transaction;
  const scaleWeightGrams = Math.round(scaleWeightKg * 1000);

  // Rate: agreed rate from bargaining, or transaction quoted rate, or 4000
  const ratePaise = tx?.agreedRatePaise || tx?.quotedRatePerKgPaise || lot.quotedRatePaise || 4000;
  const finalAmountPaise = Math.round((ratePaise * scaleWeightGrams) / 1000);

  const handoverId = `HO-PICKUP-${lot.id.slice(0, 8)}-${Date.now().toString().slice(-4)}`;
  const paymentId = `PAY-PICKUP-${lot.id.slice(0, 8)}-${Date.now().toString().slice(-4)}`;
  const handoverRef = `HO-DOORSTEP-${Date.now().toString().slice(-6)}`;

  await prisma.$transaction(async (db) => {
    // 1. Upsert Handover record (handles pre-existing handover records gracefully)
    const existingHandover = await db.handover.findFirst({
      where: {
        OR: [
          ...(tx?.id ? [{ transactionId: tx.id }] : []),
          { lotId: lot.id },
        ],
      },
    });

    if (existingHandover) {
      await db.handover.update({
        where: { id: existingHandover.id },
        data: {
          confirmedWeightGrams: scaleWeightGrams,
          status: "CONFIRMED",
          recyclerConfirmedAt: new Date(),
          confirmedById: user.userId,
        },
      });
    } else {
      await db.handover.create({
        data: {
          id: handoverId,
          lotId: lot.id,
          transactionId: tx?.id || null,
          handoverRef,
          qrPayload: `EWASTE:${lot.id}:${verificationCode || "1234"}:${scaleWeightGrams}`,
          verificationCode: verificationCode || "1234",
          declaredWeightGrams: lot.approxWeightGrams,
          confirmedWeightGrams: scaleWeightGrams,
          capturedAt: new Date(),
          locationClass: "MATCH",
          status: "CONFIRMED",
          recyclerConfirmedAt: new Date(),
          confirmedById: user.userId,
        },
      });
    }

    // 2. Upsert Payment record (Cash handed to collector)
    const existingPayment = await db.payment.findFirst({
      where: { lotId: lot.id },
    });

    if (existingPayment) {
      await db.payment.update({
        where: { id: existingPayment.id },
        data: {
          amountPaise: finalAmountPaise,
          method: paymentMode === "UPI" ? "UPI" : "CASH",
          paidAt: new Date(),
          recordedBy: "FIELD_AGENT",
          confirmedByCollector: true,
        },
      });
    } else {
      await db.payment.create({
        data: {
          id: paymentId,
          lotId: lot.id,
          transactionId: tx?.id || null,
          amountPaise: finalAmountPaise,
          method: paymentMode === "UPI" ? "UPI" : "CASH",
          paidAt: new Date(),
          recordedBy: "FIELD_AGENT",
          confirmedByCollector: true,
        },
      });
    }

    // 3. Update Transaction
    if (tx) {
      await db.transaction.update({
        where: { id: tx.id },
        data: {
          status: "PAID",
          paymentStatus: "PAID",
          handoverAt: new Date(),
          finalPricePaise: finalAmountPaise,
        },
      });
    }

    // 4. Update Lot
    await db.lot.update({
      where: { id: lot.id },
      data: {
        status: "COMPLETED",
        finalPricePaise: finalAmountPaise,
      },
    });

    // 5. Update PickupRequest
    await db.pickupRequest.update({
      where: { id: requestId },
      data: {
        status: "COMPLETED",
      },
    });
  });

  // Notify Collector
  const { sendNotification } = await import("@/lib/services/notificationService");
  await sendNotification({
    userId: lot.collector.userId,
    title: "💰 Cash Handover Completed!",
    body: `Field agent collected ${scaleWeightKg.toFixed(2)} kg of ${lot.category.nameEn} and paid ₹${(finalAmountPaise / 100).toFixed(0)} in ${paymentMode}. Transporting to recycler!`,
    dataJson: {
      lotId: lot.id,
      requestId,
      scaleWeightKg,
      finalAmountPaise,
      paymentMode,
    },
  });

  redirect(`/field/pickups?success=Doorstep+pickup+complete!+Paid+Rs+${(finalAmountPaise / 100).toFixed(0)}+cash+to+Collector+#${lot.collector.shortCode}`);
}
