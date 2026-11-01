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

  redirect(`/field/prices?success=Spot market price of ₹${buyingPriceRupees}/kg logged for category #${categoryId}`);
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
