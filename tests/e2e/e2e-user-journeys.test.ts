import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../../src/lib/prisma";
import { hashPin, hashPassword } from "../../src/lib/auth/password";
import { signMobileToken } from "../../src/lib/auth/jwt";
import { generateLotRef, validateLotRef } from "../../src/lib/domain/lotRef";
import { calculateEstimate } from "../../src/lib/domain/estimates";
import { matchRecyclers } from "../../src/lib/domain/matching";
import { evaluateWeightTolerance, classifyLocationProof, generateVerificationCode } from "../../src/lib/domain/handover";
import { buildPublicReceipt } from "../../src/lib/domain/anonymization";
import { checkWeightAnomalies, checkPriceAnomalies } from "../../src/lib/domain/anomalies";
import { processMutation } from "../../src/lib/services/syncEngine";

describe("E2E: Complete Real-World User Journeys", () => {
  it("Journey 1: Full Collector Lifecycle (Onboard -> Create Lot -> Match -> Handover -> Payment)", async () => {
    // 1. Verify Seeded Collector
    const collectorUser = await prisma.user.findUnique({
      where: { phone: "9820000001" },
      include: { collector: true },
    });
    assert.ok(collectorUser, "Seeded collector user must exist");
    assert.ok(collectorUser.collector, "Collector profile must exist");
    const collector = collectorUser.collector;

    // 2. Generate Collector JWT Token
    const token = await signMobileToken({
      userId: collectorUser.id,
      phone: collectorUser.phone,
      role: collectorUser.role,
      shortCode: collector.shortCode,
    });
    assert.ok(token, "JWT token must be generated");

    // 3. Create Lot (PCB, approx 5000g = 5kg)
    const lotCount = await prisma.lot.count({ where: { collectorId: collector.id } });
    const lotRef = generateLotRef(collector.shortCode, new Date(), lotCount + 1);
    assert.ok(validateLotRef(lotRef, collector.shortCode).valid);

    // Calculate estimate from price points / recycler rates
    const recyclerRates = await prisma.recyclerRate.findMany({
      where: { categoryId: 1, isCurrent: true },
      select: { ratePerKgPaise: true, isCurrent: true },
    });
    const estimate = calculateEstimate([], recyclerRates, 5000);
    assert.ok(estimate.estimatedValuePaise > 0);

    const lotId = `LOT-E2E-${Date.now()}`;
    const lot = await prisma.lot.create({
      data: {
        id: lotId,
        lotRef,
        collectorId: collector.id,
        categoryId: 1,
        approxWeightGrams: 5000,
        estimatedValuePaise: estimate.estimatedValuePaise,
        status: "READY",
        collectedAt: new Date(),
      },
    });
    assert.equal(lot.status, "READY");

    // 4. Match Verified Recycler
    const verifiedRecyclers = await prisma.recycler.findMany({
      where: { authorizationStatus: "VERIFIED" },
      include: {
        rates: { where: { categoryId: 1, isCurrent: true } },
        ratings: { select: { rating: true } },
      },
    });

    const candidates = verifiedRecyclers.map((r) => ({
      id: r.id,
      name: r.name,
      latitude: r.latitude,
      longitude: r.longitude,
      authorizationStatus: r.authorizationStatus,
      authorizationValidTill: r.authorizationValidTill,
      contactPhone: r.contactPhone,
      pickupAvailable: r.pickupAvailable,
      serviceRadiusKm: r.serviceRadiusKm,
      minimumWeightGrams: r.minimumWeightGrams,
      pickupChargePaise: r.pickupChargePaise,
      ratePerKgPaise: r.rates[0]?.ratePerKgPaise || 30000,
      rateEffectiveFrom: r.rates[0]?.effectiveFrom || new Date(),
      averageRating: 4.8,
    }));

    const matchResult = matchRecyclers(candidates, {
      collectorLat: 19.0434,
      collectorLng: 72.8567,
      categoryId: 1,
      approxWeightGrams: 5000,
    });
    assert.ok(matchResult.recyclers.length > 0, "Should match at least one verified recycler");
    const chosenRecycler = matchResult.recyclers[0];

    // Update lot to MATCHED and create Transaction
    const txId = `TX-E2E-${Date.now()}`;
    const agreedPricePaise = Math.round((chosenRecycler.ratePerKgPaise * 5000) / 1000);
    await prisma.lot.update({
      where: { id: lot.id },
      data: {
        status: "MATCHED",
        chosenRecyclerId: chosenRecycler.id,
        quotedRatePaise: chosenRecycler.ratePerKgPaise,
      },
    });

    await prisma.transaction.create({
      data: {
        id: txId,
        lotId: lot.id,
        collectorId: collector.id,
        recyclerId: chosenRecycler.id,
        quotedRatePerKgPaise: chosenRecycler.ratePerKgPaise,
        quotedPricePaise: agreedPricePaise,
        status: "ACCEPTED",
      },
    });

    // 5. Generate Offline Handover Record
    const handoverCode = generateVerificationCode();
    const handoverId = `HO-E2E-${Date.now()}`;
    const handover = await prisma.handover.create({
      data: {
        id: handoverId,
        lotId: lot.id,
        transactionId: txId,
        handoverRef: `HO-${lot.lotRef.replace("LOT-", "")}`,
        qrPayload: `KABADI:${lot.lotRef}:${handoverCode}`,
        verificationCode: handoverCode,
        declaredWeightGrams: 5000,
        capturedAt: new Date(),
        status: "PENDING",
      },
    });
    assert.equal(handover.status, "PENDING");

    // 6. Recycler Verifies Handover (Scale confirmed weight: 5100g, 2% tolerance = auto accept)
    const tolerance = evaluateWeightTolerance(5000, 5100);
    assert.equal(tolerance.autoAccepted, true);

    const finalAmountPaise = Math.round((chosenRecycler.ratePerKgPaise * 5100) / 1000);
    await prisma.$transaction(async (db) => {
      await db.handover.update({
        where: { id: handover.id },
        data: {
          confirmedWeightGrams: 5100,
          status: "CONFIRMED",
          recyclerConfirmedAt: new Date(),
        },
      });

      await db.payment.create({
        data: {
          id: `PAY-E2E-${Date.now()}`,
          lotId: lot.id,
          transactionId: txId,
          amountPaise: finalAmountPaise,
          method: "CASH",
          paidAt: new Date(),
          recordedBy: "RECYCLER",
          confirmedByCollector: true,
        },
      });

      await db.transaction.update({
        where: { id: txId },
        data: {
          status: "PAID",
          paymentStatus: "PAID",
          finalPricePaise: finalAmountPaise,
          handoverAt: new Date(),
        },
      });

      await db.lot.update({
        where: { id: lot.id },
        data: {
          status: "COMPLETED",
          finalPricePaise: finalAmountPaise,
        },
      });
    });

    // Verify Final Lot State
    const finalizedLot = await prisma.lot.findUnique({
      where: { id: lot.id },
      include: { transaction: true, payments: true, handovers: true },
    });
    assert.equal(finalizedLot?.status, "COMPLETED");
    assert.equal(finalizedLot?.transaction?.paymentStatus, "PAID");
    assert.equal(finalizedLot?.payments[0]?.amountPaise, finalAmountPaise);

    // 7. Verify Public Traceability Receipt has Zero PII
    const receipt = buildPublicReceipt(
      finalizedLot.lotRef,
      "Printed Circuit Board (PCB)",
      5100,
      finalAmountPaise,
      new Date(),
      chosenRecycler.name,
      "EW-MH-2026-0042"
    );
    assert.equal(receipt.lotRef, finalizedLot.lotRef);
    assert.equal(receipt.weightKg, "5.10");
    assert.ok(receipt.finalPriceRupees.startsWith("₹"));
    assert.equal(receipt.recyclerName, chosenRecycler.name);
    // Ensure no phone number is present in public receipt
    assert.equal(Object.values(receipt).some((v) => String(v).includes("9820000001")), false);

    // Clean up test records
    await prisma.payment.deleteMany({ where: { lotId: lot.id } });
    await prisma.handover.deleteMany({ where: { lotId: lot.id } });
    await prisma.transaction.deleteMany({ where: { lotId: lot.id } });
    await prisma.lot.delete({ where: { id: lot.id } });
  });

  it("Journey 2: Recycler Facility Governance & Rate Management", async () => {
    const recycler = await prisma.recycler.findFirst({
      where: { authorizationStatus: "VERIFIED" },
      include: { rates: { where: { isCurrent: true } } },
    });
    assert.ok(recycler, "Verified recycler must exist");

    // Recycler updates buying rate for Category 2 (Cables)
    const newRatePaise = 62000; // ₹620/kg
    await prisma.$transaction(async (tx) => {
      await tx.recyclerRate.updateMany({
        where: { recyclerId: recycler.id, categoryId: 2, isCurrent: true },
        data: { isCurrent: false },
      });

      await tx.recyclerRate.create({
        data: {
          recyclerId: recycler.id,
          categoryId: 2,
          ratePerKgPaise: newRatePaise,
          isCurrent: true,
          effectiveFrom: new Date(),
        },
      });
    });

    const currentCableRate = await prisma.recyclerRate.findFirst({
      where: { recyclerId: recycler.id, categoryId: 2, isCurrent: true },
    });
    assert.equal(currentCableRate?.ratePerKgPaise, newRatePaise);
  });

  it("Journey 3: Field Agent Operations (F1, F2, F3)", async () => {
    const agent = await prisma.user.findFirst({ where: { role: "FIELD_AGENT" } });
    assert.ok(agent, "Field agent must exist");

    // F2: Spot Price Logging
    const priceId = `PRICE-TEST-${Date.now()}`;
    const spotPrice = await prisma.pricePoint.create({
      data: {
        id: priceId,
        categoryId: 1,
        buyingPricePaise: 33500, // ₹335/kg
        area: "Dharavi Kumbharwada",
        district: "Mumbai",
        source: "FIELD_AGENT",
        buyerType: "SCRAP_DEALER",
        recordedById: agent.id,
        recordedAt: new Date(),
      },
    });
    assert.equal(spotPrice.buyingPricePaise, 33500);

    // F3: Training Photo & Dataset Record
    const trainingImageId = `IMG-TR-TEST-${Date.now()}`;
    let testLot = await prisma.lot.findFirst({ where: { subCategory: "FIELD_AGENT_TRAINING_CONTAINER" } });
    if (!testLot) {
      const collector = await prisma.collector.findFirst();
      if (collector) {
        testLot = await prisma.lot.create({
          data: {
            id: `LOT-TRN-${Date.now()}`,
            lotRef: `LOT-TRN-${Date.now()}`,
            collectorId: collector.id,
            categoryId: 1,
            subCategory: "FIELD_AGENT_TRAINING_CONTAINER",
            approxWeightGrams: 1000,
            status: "READY",
            collectedAt: new Date(),
          },
        });
      }
    }
    assert.ok(testLot, "Container training lot should be seeded or accessible");

    const sample = await prisma.$transaction(async (tx) => {
      await tx.lotImage.create({
        data: {
          id: trainingImageId,
          lotId: testLot.id,
          kind: "TRAINING",
          storageKey: `images/field-agent/${trainingImageId}.jpg`,
          takenAt: new Date(),
        },
      });

      return await tx.trainingSample.create({
        data: {
          imageId: trainingImageId,
          categoryId: 1,
          labelSource: "FIELD_AGENT",
          labelConfidence: 1.0,
          capturedById: agent.id,
        },
      });
    });
    assert.ok(sample);

    // Clean up
    await prisma.trainingSample.delete({ where: { id: sample.id } });
    await prisma.lotImage.delete({ where: { id: trainingImageId } });
    await prisma.pricePoint.delete({ where: { id: priceId } });
  });

  it("Journey 4: Anomaly Detection Engine (Price 3x & Weight Mismatch 40%)", () => {
    // 3x Price Anomaly
    const priceAlert = checkPriceAnomalies(90000, 25000); // ₹900 vs ₹250
    assert.ok(priceAlert);
    assert.equal(priceAlert.ruleCode, "PRICE_3X_ESTIMATE");
    assert.equal(priceAlert.severity, 2);

    // 40% Weight Discrepancy
    const weightAlert = checkWeightAnomalies(10000, 5000); // 10kg declared, 5kg scale confirmed
    assert.ok(weightAlert);
    assert.equal(weightAlert.ruleCode, "WEIGHT_DIFF_40");
    assert.equal(weightAlert.severity, 2);
  });
});
