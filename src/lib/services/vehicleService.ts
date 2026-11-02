import { randomInt } from "crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { MAX_OTP_ATTEMPTS, normalizeVehicleName, normalizeVehicleNumber, otpMatches, vehicleState } from "../domain/vehicles";
import { FlowError, notifyRecyclerStaff } from "./lotFlowService";
import { sendNotification } from "./notificationService";

const ACTIVE_TRIPS = { status: { in: ["ON_THE_WAY", "PICKED_UP"] } };

/** A recycler's vehicles with their state (empty, on the way, loaded), newest first. */
export async function listVehicles(recyclerId: string) {
  const vehicles = await prisma.vehicle.findMany({
    where: { recyclerId, isActive: true },
    include: { dispatches: { where: ACTIVE_TRIPS, select: { status: true, unloadedAt: true } } },
    orderBy: { createdAt: "desc" },
  });
  return vehicles.map((v) => {
    const unloadTimes = v.dispatches.map((d) => d.unloadedAt?.getTime() ?? 0);
    const lastUnloaded = Math.max(0, ...unloadTimes);
    return {
      id: v.id,
      name: v.name,
      number: v.number,
      ...vehicleState(v.dispatches),
      lastUnloadedAt: lastUnloaded > 0 ? new Date(lastUnloaded) : null,
    };
  });
}

/** Prisma `include` for a lot's live vehicle trip (on the way or picked up), for lot lists. */
export const LOT_PICKUP_INCLUDE = {
  vehicleDispatches: {
    where: { status: { in: ["ON_THE_WAY", "PICKED_UP"] } },
    orderBy: { dispatchedAt: "desc" },
    take: 1,
    select: { status: true, pickedUpAt: true, vehicle: { select: { number: true } } },
  },
} satisfies Prisma.LotInclude;

export type LotPickupStatus = "WAITING" | "ON_THE_WAY" | "PICKED_UP";

/**
 * Pickup state for a lot row: vehicle on the way or picked up, or WAITING when the lot is paid
 * but no vehicle has been sent yet. Null when there is nothing to pick up.
 */
export function lotPickupOf(lot: {
  status: string;
  vehicleDispatches: Array<{ status: string; pickedUpAt: Date | null; vehicle: { number: string } }>;
}): { status: LotPickupStatus; vehicleNumber?: string; pickedUpAt?: Date | null } | null {
  const trip = lot.vehicleDispatches[0];
  if (trip?.status === "ON_THE_WAY" || trip?.status === "PICKED_UP") {
    return { status: trip.status, vehicleNumber: trip.vehicle.number, pickedUpAt: trip.pickedUpAt };
  }
  return lot.status === "COMPLETED" ? { status: "WAITING" } : null;
}

export async function addVehicle(recyclerId: string, input: { name: string; number: string }) {
  const name = normalizeVehicleName(input.name);
  if (!name) throw new FlowError("VALIDATION_ERROR", "Enter a vehicle name (2-40 characters)");
  const number = normalizeVehicleNumber(input.number);
  if (!number) throw new FlowError("VALIDATION_ERROR", "Enter a valid vehicle number, e.g. MH 01 AB 1234");

  const existing = await prisma.vehicle.findUnique({ where: { recyclerId_number: { recyclerId, number } } });
  if (existing?.isActive) throw new FlowError("DUPLICATE", `Vehicle ${number} is already added`, 409);
  if (existing) {
    return prisma.vehicle.update({ where: { id: existing.id }, data: { name, isActive: true } });
  }
  return prisma.vehicle.create({ data: { recyclerId, name, number } });
}

async function ownVehicle(recyclerId: string, vehicleId: string) {
  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle || vehicle.recyclerId !== recyclerId || !vehicle.isActive) {
    throw new FlowError("NOT_FOUND", "Vehicle not found", 404);
  }
  return vehicle;
}

/** Removes a vehicle from the list. Not allowed while it is on the way to a pickup. */
export async function removeVehicle(recyclerId: string, vehicleId: string) {
  await ownVehicle(recyclerId, vehicleId);
  const onTheWay = await prisma.vehicleDispatch.count({ where: { vehicleId, status: "ON_THE_WAY" } });
  if (onTheWay > 0) throw new FlowError("VEHICLE_BUSY", "This vehicle is on the way to a pickup. Finish or cancel it first.", 409);
  await prisma.vehicle.update({ where: { id: vehicleId }, data: { isActive: false } });
}

/** Marks everything the vehicle picked up as unloaded at the yard, so it shows as empty again. */
export async function markVehicleUnloaded(recyclerId: string, vehicleId: string) {
  await ownVehicle(recyclerId, vehicleId);
  // On MongoDB `unloadedAt: null` matches only an explicit null, not a field that was never set,
  // so pick the loaded trips the same way vehicleState() does and update them by id.
  const trips = await prisma.vehicleDispatch.findMany({
    where: { vehicleId, status: "PICKED_UP" },
    select: { id: true, unloadedAt: true },
  });
  const loadedIds = trips.filter((t) => !t.unloadedAt).map((t) => t.id);
  if (loadedIds.length === 0) return 0;
  const { count } = await prisma.vehicleDispatch.updateMany({
    where: { id: { in: loadedIds } },
    data: { unloadedAt: new Date() },
  });
  return count;
}

/** The lot's current vehicle trip (not cancelled), if any. */
export async function getLotDispatch(lotId: string) {
  return prisma.vehicleDispatch.findFirst({
    where: { lotId, status: { not: "CANCELLED" } },
    include: { vehicle: { select: { id: true, name: true, number: true } } },
    orderBy: { dispatchedAt: "desc" },
  });
}

async function ownDeal(recyclerId: string, lotId: string) {
  const lot = await prisma.lot.findUnique({
    where: { id: lotId },
    include: { collector: { select: { userId: true } }, transaction: { select: { id: true } } },
  });
  if (!lot || lot.chosenRecyclerId !== recyclerId || !lot.transaction) {
    throw new FlowError("NOT_FOUND", "Deal not found", 404);
  }
  if (lot.status !== "MATCHED" && lot.status !== "COMPLETED") {
    throw new FlowError("INVALID_STATE", "A vehicle can be sent only for an active or paid deal", 409);
  }
  return lot;
}

/**
 * Sends one of the recycler's vehicles to pick up a lot. Creates a fresh 4-digit OTP that only
 * the collector sees; the pickup is done when the recycler's side enters it.
 */
export async function dispatchVehicle(recyclerId: string, lotId: string, vehicleId: string) {
  const lot = await ownDeal(recyclerId, lotId);
  const vehicle = await ownVehicle(recyclerId, vehicleId);

  const current = await getLotDispatch(lotId);
  if (current) {
    throw new FlowError(
      "ALREADY_SENT",
      current.status === "PICKED_UP" ? "This lot is already picked up" : `Vehicle ${current.vehicle.number} is already on the way`,
      409
    );
  }

  const dispatch = await prisma.vehicleDispatch.create({
    data: { lotId, recyclerId, vehicleId, otp: String(randomInt(0, 10000)).padStart(4, "0") },
  });

  await sendNotification({
    userId: lot.collector.userId,
    title: "Vehicle on the way",
    body: `${vehicle.name} (${vehicle.number}) is coming to pick up lot ${lot.lotRef}. Give the driver the pickup code shown on the lot page.`,
    dataJson: { lotId },
  });

  return { dispatchId: dispatch.id, vehicle: { id: vehicle.id, name: vehicle.name, number: vehicle.number } };
}

/** Calls the vehicle back before pickup. The collector's OTP stops working. */
export async function cancelDispatch(recyclerId: string, lotId: string) {
  const lot = await ownDeal(recyclerId, lotId);
  const { count } = await prisma.vehicleDispatch.updateMany({
    where: { lotId, recyclerId, status: "ON_THE_WAY" },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });
  if (count === 0) throw new FlowError("NOT_ON_THE_WAY", "No vehicle is on the way for this lot", 409);

  await sendNotification({
    userId: lot.collector.userId,
    title: "Vehicle cancelled",
    body: `The vehicle for lot ${lot.lotRef} was called back. The buyer will send another one.`,
    dataJson: { lotId },
  });
}

/**
 * The vehicle side enters the collector's OTP. Correct: the lot is picked up and both sides are told.
 * Wrong: counts an attempt; after MAX_OTP_ATTEMPTS the recycler must cancel and send again.
 */
export async function verifyPickupOtp(recyclerId: string, lotId: string, otp: string) {
  const lot = await ownDeal(recyclerId, lotId);
  const dispatch = await prisma.vehicleDispatch.findFirst({
    where: { lotId, recyclerId, status: "ON_THE_WAY" },
    include: { vehicle: true },
  });
  if (!dispatch) throw new FlowError("NOT_ON_THE_WAY", "No vehicle is on the way for this lot", 409);
  if (dispatch.otpAttempts >= MAX_OTP_ATTEMPTS) {
    throw new FlowError("OTP_LOCKED", "Too many wrong codes. Cancel this vehicle and send it again for a new code.", 429);
  }

  if (!otpMatches(dispatch.otp, otp)) {
    const updated = await prisma.vehicleDispatch.update({ where: { id: dispatch.id }, data: { otpAttempts: { increment: 1 } } });
    const left = Math.max(0, MAX_OTP_ATTEMPTS - updated.otpAttempts);
    throw new FlowError("WRONG_OTP", left > 0 ? `Wrong code. ${left} tries left.` : "Wrong code. No tries left: cancel and send the vehicle again.", 400);
  }

  const now = new Date();
  const { count } = await prisma.vehicleDispatch.updateMany({
    where: { id: dispatch.id, status: "ON_THE_WAY" },
    data: { status: "PICKED_UP", pickedUpAt: now },
  });
  if (count === 0) throw new FlowError("NOT_ON_THE_WAY", "This pickup was already finished or cancelled", 409);

  const summary = `Lot ${lot.lotRef} was picked up by ${dispatch.vehicle.name} (${dispatch.vehicle.number}).`;
  await sendNotification({ userId: lot.collector.userId, title: "Pickup complete", body: summary, dataJson: { lotId } });
  await notifyRecyclerStaff(recyclerId, "Pickup complete", summary, { lotId });

  return { pickedUpAt: now, vehicle: { id: dispatch.vehicle.id, name: dispatch.vehicle.name, number: dispatch.vehicle.number } };
}
