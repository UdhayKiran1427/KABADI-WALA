"use server";

import { prisma } from "@/lib/prisma";
import { requireRole, createSessionCookie, clearSessionCookie } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { evaluateWeightTolerance, classifyLocationProof, verifyEnteredHandoverCode } from "@/lib/domain/handover";
import { validateLotTransition, type LotStatus } from "@/lib/domain/lotStateMachine";
import { checkWeightAnomalies, checkPriceAnomalies, checkLocationAnomalies } from "@/lib/domain/anomalies";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { FlowError, respondToOffer } from "@/lib/services/lotFlowService";
import { amountPaise, firstPositiveRate } from "@/lib/domain/money";

/**
 * Sign in for Recycler Staff.
 */
export async function recyclerLoginAction(formData: FormData): Promise<void> {
  const phone = formData.get("phone") as string;
  const password = formData.get("password") as string;

  if (!phone || !password) {
    redirect("/recycler/login?error=Phone+and+password+are+required");
  }

  const user = await prisma.user.findUnique({
    where: { phone },
    include: { recyclerStaff: { include: { recycler: true } } },
  });

  if (!user || user.role !== "RECYCLER" || !user.isActive) {
    redirect("/recycler/login?error=Invalid+credentials+or+unauthorized");
  }

  const isValid = await verifyPassword(password, user.pinHash);
  if (!isValid) {
    redirect("/recycler/login?error=Invalid+credentials");
  }

  const recyclerId = user.recyclerStaff?.recyclerId;
  await createSessionCookie({
    userId: user.id,
    phone: user.phone,
    role: "RECYCLER",
    recyclerId,
  });

  redirect("/recycler");
}

export async function recyclerLogoutAction() {
  await clearSessionCookie();
  redirect("/recycler/login");
}

/**
 * Accept incoming lot (R1).
 */
export async function acceptLotAction(lotId: string) {
  const { dbUser } = await requireRole(["RECYCLER"]);
  const recyclerId = dbUser.recyclerId;
  if (!recyclerId) throw new Error("No recycler facility assigned");

  // ROLE RB2.2: If facility authorization is EXPIRED or SUSPENDED, block accepting lots
  const facility = await prisma.recycler.findUnique({
    where: { id: recyclerId },
    select: { authorizationStatus: true },
  });
  if (facility?.authorizationStatus === "EXPIRED" || facility?.authorizationStatus === "SUSPENDED") {
    throw new Error("Facility authorization is expired or suspended. Accepting new lots is blocked.");
  }

  // Only the recycler the collector selected may act on the lot
  const lot = await prisma.lot.findUnique({ where: { id: lotId }, select: { chosenRecyclerId: true } });
  if (!lot || lot.chosenRecyclerId !== recyclerId) throw new Error("Lot not found");

  await prisma.lot.update({
    where: { id: lotId },
    data: {
      status: "MATCHED",
      chosenRecyclerId: recyclerId,
      updatedAt: new Date(),
    },
  });

  revalidatePath("/recycler");
}

export async function acceptLotFormAction(formData: FormData) {
  const lotId = formData.get("lotId") as string;
  if (!lotId) return;
  await acceptLotAction(lotId);
}

/**
 * Update pickup request status (R1).
 */
const PICKUP_STATUSES = ["ACCEPTED", "ON_THE_WAY", "ARRIVED", "COMPLETED", "CANCELLED"];

export async function updatePickupStatusAction(requestId: string, newStatus: string) {
  const { dbUser } = await requireRole(["RECYCLER"]);
  if (!PICKUP_STATUSES.includes(newStatus)) throw new Error("Invalid pickup status");

  const request = await prisma.pickupRequest.findUnique({ where: { id: requestId }, select: { recyclerId: true } });
  if (!request || request.recyclerId !== dbUser.recyclerId) throw new Error("Pickup request not found");

  await prisma.pickupRequest.update({
    where: { id: requestId },
    data: {
      status: newStatus,
      updatedAt: new Date(),
    },
  });

  revalidatePath("/recycler");
}

export async function updatePickupStatusFormAction(formData: FormData) {
  const requestId = formData.get("requestId") as string;
  const newStatus = formData.get("status") as string;
  if (!requestId || !newStatus) return;
  await updatePickupStatusAction(requestId, newStatus);
}

export async function dispatchPickupFormAction(formData: FormData) {
  const { dbUser } = await requireRole(["RECYCLER", "ADMIN"]);
  const lotId = formData.get("lotId") as string;
  if (!lotId || !dbUser.recyclerId) return;

  const lot = await prisma.lot.findUnique({
    where: { id: lotId },
    include: { collector: true },
  });

  if (!lot) return;

  const existing = await prisma.pickupRequest.findFirst({
    where: { lotId, status: { notIn: ["CANCELLED", "EXPIRED"] } },
  });

  if (!existing) {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await prisma.pickupRequest.create({
      data: {
        collectorId: lot.collector.userId,
        recyclerId: dbUser.recyclerId,
        lotId,
        slot: new Date(),
        status: "REQUESTED",
        expiresAt,
      },
    });

    const { sendNotification } = await import("@/lib/services/notificationService");
    await sendNotification({
      userId: lot.collector.userId,
      title: "🚚 Doorstep Pickup Dispatched!",
      body: `Recycler dispatched a field agent with vehicle and portable scale to pick up Lot ${lot.lotRef}.`,
      dataJson: { lotId, status: "REQUESTED" },
    });
  }

  revalidatePath("/recycler");
}

/**
 * Confirm or dispute handover with confirmed weight and mark payment (R2).
 */
const CODE_ERROR_QUERY = (query: string) => `/recycler/verify?query=${encodeURIComponent(query)}&error=code`;

export async function confirmHandoverAction(formData: FormData) {
  const { dbUser } = await requireRole(["RECYCLER"]);
  const recyclerId = dbUser.recyclerId;
  if (!recyclerId) throw new Error("No recycler facility assigned");

  const handoverId = formData.get("handoverId") as string;
  const lotId = formData.get("lotId") as string;
  const confirmedWeightKg = parseFloat(formData.get("confirmedWeightKg") as string);
  const actionType = formData.get("actionType") as string; // "CONFIRM" or "DISPUTE"
  const disputeReason = formData.get("disputeReason") as string;
  const markPaidRequested = formData.get("markPaid") === "true";
  const paymentMethod = (formData.get("paymentMethod") as "CASH" | "UPI") || "CASH";
  const upiRef = formData.get("upiRef") as string;
  const downstreamStatus = formData.get("downstreamStatus") as "RECEIVED" | "SENT_TO_PROCESSING" | "PROCESSED";

  const confirmedWeightGrams = Math.round(confirmedWeightKg * 1000);

  const lot = await prisma.lot.findUnique({
    where: { id: lotId },
    include: {
      transaction: true,
      category: { include: { recyclerRates: { where: { recyclerId, isCurrent: true } } } },
    },
  });

  if (!lot || lot.chosenRecyclerId !== recyclerId) throw new Error("Lot not found");

  // The collector's 4-digit code must match the handover: hashed with its ref and compared in constant time
  // (legacy plain codes only for handovers that have no hash).
  const queryForRedirect = (formData.get("query") as string) || lot.lotRef;
  const enteredCode = (formData.get("verificationCode") as string) || "";
  const handoverToCheck = handoverId
    ? await prisma.handover.findUnique({ where: { id: handoverId } })
    : await prisma.handover.findFirst({ where: { lotId }, orderBy: { capturedAt: "desc" } });
  if (handoverToCheck) {
    if (handoverToCheck.lotId !== lotId) throw new Error("Lot not found");
    if (!verifyEnteredHandoverCode(handoverToCheck, enteredCode)) redirect(CODE_ERROR_QUERY(queryForRedirect));
  }

  // Spec s2: the final amount is the actual weight x the rate locked at selection. Never invent a rate.
  const ratePerKgPaise = firstPositiveRate(lot.quotedRatePaise, lot.transaction?.quotedRatePerKgPaise);
  if (ratePerKgPaise === null) redirect(`/recycler/verify?query=${encodeURIComponent(queryForRedirect)}&error=no_rate`);
  const finalPricePaise = amountPaise(confirmedWeightGrams, ratePerKgPaise);

  // Evaluate weight tolerance (spec s4). Outside tolerance the collector decides (accept / dispute), so the
  // handover is only WEIGHED and nothing can be paid yet.
  const declaredWeightGrams = lot.approxWeightGrams;
  const tolerance = evaluateWeightTolerance(declaredWeightGrams, confirmedWeightGrams);
  const awaitingCollector = actionType !== "DISPUTE" && !tolerance.autoAccepted;
  const markPaid = markPaidRequested && !awaitingCollector;

  const recycler = await prisma.recycler.findUnique({ where: { id: recyclerId } });
  const existingHandover = handoverId
    ? await prisma.handover.findUnique({ where: { id: handoverId } })
    : await prisma.handover.findFirst({ where: { lotId } });

  // Classify location proof: compare lot/handover GPS with recycler facility GPS
  const locProof = classifyLocationProof(
    existingHandover?.latitude ?? lot.collectLat,
    existingHandover?.longitude ?? lot.collectLng,
    recycler?.latitude,
    recycler?.longitude,
    existingHandover?.accuracy,
    existingHandover?.mockLocationFlag
  );

  const locAnomalies = checkLocationAnomalies(
    locProof.locationClass,
    locProof.distanceToRecyclerMeters,
    locProof.spoofFlags
  );
  const weightAnomaly = checkWeightAnomalies(declaredWeightGrams, confirmedWeightGrams);
  const priceAnomaly = checkPriceAnomalies(finalPricePaise, lot.estimatedValuePaise);

  const anomaliesToCreate = [
    ...locAnomalies,
    ...(weightAnomaly ? [weightAnomaly] : []),
    ...(priceAnomaly ? [priceAnomaly] : []),
  ];

  await prisma.$transaction(async (tx) => {
    // 1. Update Handover
    const handoverStatus = actionType === "DISPUTE" ? "DISPUTED" : awaitingCollector ? "WEIGHED" : "CONFIRMED";
    if (existingHandover) {
      await tx.handover.update({
        where: { id: existingHandover.id },
        data: {
          confirmedWeightGrams,
          status: handoverStatus,
          recyclerConfirmedAt: new Date(),
          confirmedById: dbUser.id,
          locationClass: locProof.locationClass,
          distanceToRecyclerMeters: locProof.distanceToRecyclerMeters,
          disputeReason: actionType === "DISPUTE" ? disputeReason : (locProof.spoofFlags.join("; ") || null),
          downstreamStatus: downstreamStatus || "RECEIVED",
          downstreamUpdatedAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }

    // 1b. Create anomaly flags if triggered
    for (const anomaly of anomaliesToCreate) {
      const existing = await tx.anomalyFlag.findFirst({
        where: { lotId, ruleCode: anomaly.ruleCode },
      });
      if (!existing) {
        await tx.anomalyFlag.create({
          data: {
            lotId,
            ruleCode: anomaly.ruleCode,
            type: anomaly.type,
            severity: anomaly.severity,
            reason: anomaly.reason,
            status: "OPEN",
          },
        });
      }
    }

    // 2. If disputed, record Dispute row
    if (actionType === "DISPUTE") {
      await tx.dispute.create({
        data: {
          lotId,
          handoverId,
          reason: disputeReason || "Weight or quality mismatch disputed by recycler",
          raisedBy: "RECYCLER",
        },
      });
    }

    // 3. Lot status: weighed + confirmed stays HANDED_OVER (client state CONFIRMED); COMPLETED (= PAID) only once paid.
    const lotNewStatus = actionType === "DISPUTE" ? "DISPUTED" : markPaid ? "COMPLETED" : "HANDED_OVER";
    const lotNewTx = actionType === "DISPUTE" ? "DISPUTED" : markPaid ? "PAID" : awaitingCollector ? "HANDED_OVER" : "CONFIRMED";
    // A lot still MATCHED passes through HANDED_OVER on its way to COMPLETED; every step goes through the state machine.
    let stepFrom = lot.status as LotStatus;
    for (const step of (lot.status === "MATCHED" && lotNewStatus !== "HANDED_OVER" ? ["HANDED_OVER", lotNewStatus] : [lotNewStatus]) as LotStatus[]) {
      if (!validateLotTransition(stepFrom, step, true).valid) throw new Error(`Lot cannot move from ${lot.status} to ${lotNewStatus}`);
      stepFrom = step;
    }
    await tx.lot.update({
      where: { id: lotId },
      data: {
        status: lotNewStatus,
        finalPricePaise: awaitingCollector ? null : finalPricePaise,
        transactionStatus: lotNewTx,
        paymentStatus: markPaid ? "PAID" : "UNPAID",
        updatedAt: new Date(),
      },
    });

    // 4. Update Transaction
    await tx.transaction.upsert({
      where: { lotId },
      create: {
        id: `TX-${lotId}`,
        lotId,
        collectorId: lot.collectorId,
        recyclerId,
        quotedRatePerKgPaise: ratePerKgPaise,
        quotedPricePaise: finalPricePaise,
        finalPricePaise: awaitingCollector ? null : finalPricePaise,
        status: lotNewTx,
        paymentStatus: markPaid ? "PAID" : "UNPAID",
      },
      update: {
        finalPricePaise: awaitingCollector ? null : finalPricePaise,
        status: lotNewTx,
        paymentStatus: markPaid ? "PAID" : "UNPAID",
        updatedAt: new Date(),
      },
    });

    // 5. If marked paid, create recycler payment
    if (markPaid) {
      await tx.payment.create({
        data: {
          id: `PAY-REC-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          lotId,
          amountPaise: finalPricePaise,
          method: paymentMethod,
          upiRef: paymentMethod === "UPI" ? upiRef : null,
          paidAt: new Date(),
          confirmedByCollector: false, // the collector confirms "Money received" (C9); see syncHandlers payment match
          confirmedByRecyclerId: dbUser.id,
          recordedBy: "RECYCLER",
        },
      });
    }

    // 7. Create shareable receipt token
    const tokenStr = `rcpt_${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;
    const existingToken = await tx.receiptShareToken.findFirst({ where: { lotId } });
    if (existingToken) {
      await tx.receiptShareToken.update({
        where: { id: existingToken.id },
        data: { token: tokenStr },
      });
    } else {
      await tx.receiptShareToken.create({
        data: {
          lotId,
          token: tokenStr,
          expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
        },
      });
    }
  });

  revalidatePath("/recycler");
  revalidatePath("/recycler/verify");
  redirect("/recycler");
}

/**
 * Save rates (R3).
 * Enforces "one isCurrent rate per (recycler, category)" inside a $transaction.
 */
export async function saveRatesAction(formData: FormData) {
  const { dbUser } = await requireRole(["RECYCLER"]);
  const recyclerId = dbUser.recyclerId;
  if (!recyclerId) throw new Error("No recycler facility assigned");

  const pickupAvailable = formData.get("pickupAvailable") === "on";
  const pickupChargeRupees = parseFloat((formData.get("pickupChargeRupees") as string) || "0");
  const minimumWeightKg = parseFloat((formData.get("minimumWeightKg") as string) || "0");

  await prisma.$transaction(async (tx) => {
    // Update recycler pickup settings
    await tx.recycler.update({
      where: { id: recyclerId },
      data: {
        pickupAvailable,
        pickupChargePaise: Math.round(pickupChargeRupees * 100),
        minimumWeightGrams: Math.round(minimumWeightKg * 1000),
        updatedAt: new Date(),
      },
    });

    // Update material rates
    const categories = await tx.materialCategory.findMany({ where: { isActive: true } });
    for (const cat of categories) {
      const rateKey = `rate_${cat.id}`;
      const rateRupeesStr = formData.get(rateKey) as string;
      if (rateRupeesStr) {
        const ratePerKgPaise = Math.round(parseFloat(rateRupeesStr) * 100);

        // Deactivate previous current rate
        await tx.recyclerRate.updateMany({
          where: { recyclerId, categoryId: cat.id, isCurrent: true },
          data: { isCurrent: false },
        });

        // Insert new current rate
        await tx.recyclerRate.create({
          data: {
            recyclerId,
            categoryId: cat.id,
            ratePerKgPaise,
            isCurrent: true,
            effectiveFrom: new Date(),
          },
        });
      }
    }
  });

  revalidatePath("/recycler/rates");
}

/**
 * Update facility profile & authorization (R4).
 * Changing authorizationNo or validTill resets status to PENDING.
 */
export async function updateProfileAction(formData: FormData) {
  const { dbUser } = await requireRole(["RECYCLER"]);
  const recyclerId = dbUser.recyclerId;
  if (!recyclerId) throw new Error("No recycler facility assigned");

  const name = formData.get("name") as string;
  const contactPhone = formData.get("contactPhone") as string;
  const address = formData.get("address") as string;
  const serviceRadiusKm = parseFloat((formData.get("serviceRadiusKm") as string) || "10");
  const authorizationNo = formData.get("authorizationNo") as string;
  const validTillStr = formData.get("validTill") as string;
  const latStr = formData.get("latitude") as string;
  const lngStr = formData.get("longitude") as string;

  const current = await prisma.recycler.findUnique({ where: { id: recyclerId } });
  if (!current) throw new Error("Recycler not found");

  const validTill = validTillStr ? new Date(validTillStr) : current.authorizationValidTill;
  const latitude = latStr && !isNaN(parseFloat(latStr)) ? parseFloat(latStr) : current.latitude;
  const longitude = lngStr && !isNaN(parseFloat(lngStr)) ? parseFloat(lngStr) : current.longitude;

  // Check if authorization details changed
  const authChanged =
    current.authorizationNo !== authorizationNo ||
    (validTill && current.authorizationValidTill?.getTime() !== validTill.getTime());

  await prisma.recycler.update({
    where: { id: recyclerId },
    data: {
      name,
      contactPhone,
      address,
      latitude,
      longitude,
      serviceRadiusKm,
      authorizationNo,
      authorizationValidTill: validTill,
      authorizationStatus: authChanged ? "PENDING" : current.authorizationStatus,
      updatedAt: new Date(),
    },
  });

  revalidatePath("/recycler/profile");
}

export async function recyclerAcceptBargainAction(formData: FormData) {
  await requireRole(["RECYCLER", "ADMIN"]);
  const transactionId = formData.get("transactionId") as string;

  const txRecord = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: { lot: true, collector: { include: { user: true } } },
  });

  if (!txRecord || !txRecord.bargainRatePaise) {
    throw new Error("No active bargain offer found");
  }

  const agreedRatePaise = txRecord.bargainRatePaise;
  const agreedPricePaise = amountPaise(txRecord.lot.approxWeightGrams, agreedRatePaise);

  await prisma.$transaction(async (tx) => {
    await tx.transaction.update({
      where: { id: transactionId },
      data: {
        quotedRatePerKgPaise: agreedRatePaise,
        quotedPricePaise: agreedPricePaise,
        bargainStatus: "AGREED",
        agreedRatePaise,
      },
    });

    await tx.lot.update({
      where: { id: txRecord.lotId },
      data: {
        quotedRatePaise: agreedRatePaise,
      },
    });
  });

  // Notify collector
  const { sendNotification } = await import("@/lib/services/notificationService");
  await sendNotification({
    userId: txRecord.collector.userId,
    title: "🎉 Price Agreed by Recycler!",
    body: `Recycler accepted your price of ₹${(agreedRatePaise / 100).toFixed(0)}/kg for Lot ${txRecord.lot.lotRef}!`,
    dataJson: { lotId: txRecord.lotId, agreedRatePaise },
  });

  revalidatePath("/recycler");
}

export async function recyclerCounterBargainAction(formData: FormData) {
  await requireRole(["RECYCLER", "ADMIN"]);
  const transactionId = formData.get("transactionId") as string;
  const counterRateRupees = parseFloat(formData.get("counterRateRupees") as string);
  const note = (formData.get("note") as string)?.trim() || "";

  if (isNaN(counterRateRupees) || counterRateRupees <= 0) {
    throw new Error("Invalid counter rate");
  }

  const txRecord = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: { lot: true, collector: { include: { user: true } } },
  });

  if (!txRecord) {
    throw new Error("Transaction not found");
  }

  const counterRatePaise = Math.round(counterRateRupees * 100);

  await prisma.transaction.update({
    where: { id: transactionId },
    data: {
      bargainRatePaise: counterRatePaise,
      bargainBy: "RECYCLER",
      bargainNote: note,
      bargainStatus: "OFFER_BY_RECYCLER",
    },
  });

  // Notify collector
  const { sendNotification } = await import("@/lib/services/notificationService");
  await sendNotification({
    userId: txRecord.collector.userId,
    title: "💬 Counter-Offer from Recycler",
    body: `Recycler proposed ₹${counterRateRupees}/kg for Lot ${txRecord.lot.lotRef}. Check and confirm!`,
    dataJson: { lotId: txRecord.lotId, counterRatePaise, note },
  });

  revalidatePath("/recycler");
}


export async function recyclerRegisterAction(formData: FormData): Promise<void> {
  const name = (formData.get("name") as string)?.trim();
  const authorizationNo = (formData.get("authorizationNo") as string)?.trim();
  const contactPhone = (formData.get("contactPhone") as string)?.trim();
  const password = (formData.get("password") as string)?.trim();
  const confirmPassword = (formData.get("confirmPassword") as string)?.trim();
  const address = (formData.get("address") as string)?.trim();
  const area = (formData.get("area") as string)?.trim() || "Industrial Area";
  const district = (formData.get("district") as string)?.trim() || "Mumbai";
  const state = (formData.get("state") as string)?.trim() || "Maharashtra";
  const latitude = parseFloat(formData.get("latitude") as string) || 19.076;
  const longitude = parseFloat(formData.get("longitude") as string) || 72.8777;
  const pickupAvailable = formData.get("pickupAvailable") === "on" || formData.get("pickupAvailable") === "true";
  const serviceRadiusKm = parseFloat(formData.get("serviceRadiusKm") as string) || 15;
  const minimumWeightKg = parseFloat(formData.get("minimumWeightKg") as string) || 10;
  const pickupChargeRupees = parseFloat(formData.get("pickupChargeRupees") as string) || 0;

  if (!name || !authorizationNo || !contactPhone || !password || !address) {
    redirect("/recycler/register?error=Please fill in all required fields");
  }

  if (!/^\d{10}$/.test(contactPhone)) {
    redirect("/recycler/register?error=Contact phone must be 10 digits");
  }

  if (password.length < 6) {
    redirect("/recycler/register?error=Password must be at least 6 characters long");
  }

  if (password !== confirmPassword) {
    redirect("/recycler/register?error=Passwords do not match");
  }

  const existingUser = await prisma.user.findUnique({
    where: { phone: contactPhone },
  });

  if (existingUser) {
    redirect("/recycler/register?error=A user with this phone number already exists. Please sign in.");
  }

  const existingAuth = await prisma.recycler.findUnique({
    where: { authorizationNo },
  });

  if (existingAuth) {
    redirect("/recycler/register?error=A facility with this authorization number is already registered.");
  }

  const { hashPassword } = await import("@/lib/auth/password");
  const passwordHash = await hashPassword(password);

  const minimumWeightGrams = Math.round(minimumWeightKg * 1000);
  const pickupChargePaise = Math.round(pickupChargeRupees * 100);

  const validTill = new Date();
  validTill.setFullYear(validTill.getFullYear() + 2); // 2 years valid by default

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        phone: contactPhone,
        pinHash: passwordHash,
        role: "RECYCLER",
        language: "EN",
      },
    });

    const recycler = await tx.recycler.create({
      data: {
        name,
        authorizationNo,
        authorizationStatus: "VERIFIED", // Verified for immediate demo readiness
        authorizationValidTill: validTill,
        contactPhone,
        address,
        area,
        district,
        state,
        latitude,
        longitude,
        pickupAvailable,
        serviceRadiusKm,
        minimumWeightGrams,
        pickupChargePaise,
      },
    });

    const staff = await tx.recyclerStaff.create({
      data: {
        userId: user.id,
        recyclerId: recycler.id,
      },
    });

    // Populate initial default rates for categories 1-7
    const defaultRates = [
      { categoryId: 1, rate: 4500 }, // Copper ₹45/kg
      { categoryId: 2, rate: 1200 }, // PCB ₹12/kg
      { categoryId: 3, rate: 2500 }, // Battery ₹25/kg
      { categoryId: 4, rate: 800 },  // Display ₹8/kg
      { categoryId: 5, rate: 600 },  // Cables ₹6/kg
      { categoryId: 6, rate: 200 },  // Plastic ₹2/kg
      { categoryId: 7, rate: 500 },  // Mixed ₹5/kg
    ];

    await tx.recyclerRate.createMany({
      data: defaultRates.map((r) => ({
        recyclerId: recycler.id,
        categoryId: r.categoryId,
        ratePerKgPaise: r.rate,
        effectiveFrom: new Date(),
        isCurrent: true,
      })),
    });

    return { user, recycler, staff };
  });

  await createSessionCookie({
    userId: result.user.id,
    phone: result.user.phone,
    role: "RECYCLER",
    recyclerId: result.recycler.id,
  });

  redirect("/recycler?welcome=true");
}

/**
 * Recycler answers a nearby lot broadcast: "ready to buy" (with its rate) or "not interested".
 * The collector's identity stays hidden until the collector selects a recycler.
 */
export async function respondToLotOfferAction(formData: FormData) {
  const { dbUser } = await requireRole(["RECYCLER"]);
  if (!dbUser.recyclerId) {
    redirect("/recycler?error=Your account is not linked to a recycler facility");
  }

  // ROLE RB2.2: Block offering when facility is expired or suspended
  const facility = await prisma.recycler.findUnique({
    where: { id: dbUser.recyclerId },
    select: { authorizationStatus: true },
  });
  if (facility?.authorizationStatus === "EXPIRED" || facility?.authorizationStatus === "SUSPENDED") {
    redirect("/recycler?error=Facility+authorization+is+expired+or+suspended.+Accepting+new+lots+is+blocked.");
  }

  const response = formData.get("response") === "DECLINED" ? "DECLINED" : "INTERESTED";
  // One "rate_<categoryId>" field (₹/kg) per material; "rateRupees" is the older single-rate field
  const itemRates: Array<{ categoryId: number; ratePerKgPaise: number }> = [];
  for (const [key, value] of formData.entries()) {
    const match = /^rate_(\d+)$/.exec(key);
    const rupees = typeof value === "string" ? parseFloat(value) : NaN;
    if (match) itemRates.push({ categoryId: Number(match[1]), ratePerKgPaise: Number.isFinite(rupees) ? Math.round(rupees * 100) : 0 });
  }
  const rateRupees = parseFloat(formData.get("rateRupees") as string);

  let result: Awaited<ReturnType<typeof respondToOffer>>;
  try {
    result = await respondToOffer(
      formData.get("offerId") as string,
      dbUser.recyclerId,
      response,
      { itemRates, ratePerKgPaise: Number.isFinite(rateRupees) ? Math.round(rateRupees * 100) : undefined }
    );
  } catch (err) {
    if (err instanceof FlowError) {
      redirect(`/recycler?error=${encodeURIComponent(err.message)}`);
    }
    throw err;
  }

  revalidatePath("/recycler");
  redirect(
    result.status === "INTERESTED"
      ? "/recycler?success=You are on the collector's list. You will be notified if they choose you."
      : "/recycler"
  );
}
